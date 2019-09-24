const {db} = require('../util/admin');

exports.getAllPosts = (req, res) => {
	db
		.collection('posts')
		.orderBy('postedAt', 'desc')
		.get()
		.then((data) => {
			let posts = [];
			data.forEach(doc => {
				posts.push({
					postId: doc.id,
					body: doc.data().body,
					userName: doc.data().userName,
					postedAt: doc.data().postedAt,
					commentCount: doc.data().commentCount,
					voteCount: doc.data().voteCount,
					userImage: doc.data().userImage
				});
			});
			return res.json(posts);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).json({error: err.code});
		});
}

exports.createNewPost = (req, res)=> {
	if (req.body.body.trim() === '') {
		return res.status(400).json({body: 'Body cannot be empty'});
	}

	const newPost = {
		body: req.body.body,
		userName: req.user.name,
		userImage: req.user.imageUrl,
		postedAt: new Date().toISOString(),
		voteCount: 0,
		commentCount: 0
	};

	db.collection('posts')
		.add(newPost)
		.then((doc) => {
			const resPost = newPost;
			resPost.postId = doc.id;
			res.json(resPost);
		})
		.catch((err) => {
			res.status(500).json({error: 'Something went wrong'});
			console.error(err);
		});
}

//fetch one post
exports.getPost = (req, res) => {
	let postData = {};
	db.doc(`/posts/${req.params.postId}`).get()
		.then(doc => {
			if(!doc.exists){
				return res.status(404).json({error: 'Post not found'});
			}
			postData = doc.data();
			postData.postId = doc.id;
			return db
				.collection('comments')
				.orderBy('postedAt', 'desc')
				.where('postId', '==', req.params.postId)
				.get();
		})
		.then((data) => {
			postData.comments = [];
			data.forEach(doc => {
				postData.comments.push(doc.data());
			})
			return res.json(postData);
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({error: err.code});
		})
}

//comment on a post
exports.commentOnPost = (req, res) => {
	if(req.body.body.trim() === '')
		return res.status(400).json({comment: 'Must not be empty'});

	const newComment = {
		body: req.body.body,
		postedAt: new Date().toISOString(),
		postId: req.params.postId,
		userName: req.user.name,
		userImage: req.user.imageUrl
	};

	db.doc(`/posts/${req.params.postId}`)
		.get()
		.then(doc => {
			if(!doc.exists) {
				return res.status(404).json({error: 'Post not found'});
			}
			return doc.ref.update({commentCount: doc.data().commentCount + 1});
		})
		.then(() => {
			return db.collection('comments').add(newComment);
		})
		.then(() => {
			res.json(newComment);
		})
		.catch (err => {
			console.log(err);
			res.status(500).json({error: 'Something went wrong'});
		})
}

//vote a post
exports.votePost = (req, res) => {
	const voteDocument = db
		.collection('votes')
		.where('userName', '==', req.user.name)
		.where('postId', '==', req.params.postId).limit(1);

	const postDocument = db.doc(`/posts/${req.params.postId}`);

	let postData;

	postDocument
		.get()
		.then((doc) => {
			if(doc.exists){
				postData = doc.data();
				postData.postId = doc.id;
				return voteDocument.get();
			} else {
				return res.status(404).json({error: 'Post not found'});
			}
		})
		.then ((data) => {
			if(data.empty) {
				return db.collection('votes')
					.add({
						postId: req.params.postId,
						userName: req.user.name
					})
					.then(() => {
						postData.voteCount++;
						return postDocument.update({voteCount: postData.voteCount});
					})
					.then(() => {
						return res.json(postData);
					})
			} else {
				return res.status(400).json({error: 'You already voted this'});
			}
		})
		.catch(err => {
			res.status(500).json({error: err.code});
		});
 };


//remove vote
 exports.unvotePost = (req, res) => {
 	const voteDocument = db.collection('votes')
		.where('userName', '==', req.user.name)
		.where('postId', '==', req.params.postId).limit(1);

	const postDocument = db.doc(`/posts/${req.params.postId}`);

	let postData;

	postDocument
		.get()
		.then(doc => {
			if(doc.exists){
				postData = doc.data();
				postData.postId = doc.id;
				return voteDocument.get();
			} else {
				return res.status(404).json({error: 'Post not found'});
			}
		})
		.then ((data) => {
			if(data.empty) {
				return res.status(400).json({error: 'You have not voted this'});
			} else {
				return db.doc(`/votes/${data.docs[0].id}`).delete()
					.then(() => {
						postData.voteCount--;
						return postDocument.update({voteCount: postData.voteCount});
					})
					.then(() => {
						res.json(postData);
					})
			}
		})
		.catch(err => {
			res.status(500).json({error: err.code})
		});
 };

 //delete a post
exports.deletePost = (req, res) => {
	const document = db.doc(`/posts/${req.params.postId}`);
	document.get()
		.then((doc) => {
			if(!doc.exists){
				return res.status(404).json({error: 'Post not found'});
			}
			if (doc.data().userName !== req.user.name) {
				return res.status(403).json({error: 'Unauthorized'});
			} else {
				return document.delete();
			}
		})
		.then(() => {
			res.json({message: 'Post deleted successfully'});
		})
		.catch(err => {
			return res.status(500).json({error: err.code});
		})
}