const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');

const {db} = require('./util/admin');

const {
	getAllPosts,
	createNewPost,
	getPost,
	commentOnPost,
	votePost,
	unvotePost,
	deletePost
} = require('./handlers/posts');

const {
	signup,
	login,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsRead
} = require('./handlers/users');

//post routes
app.get('/posts', getAllPosts);
app.post('/post', FBAuth, createNewPost);
app.get('/post/:postId', getPost);
app.delete('/post/:postId', FBAuth, deletePost);
app.get('/post/:postId/vote', FBAuth, votePost);
app.get('/post/:postId/unvote', FBAuth, unvotePost);
app.post('/post/:postId/comment', FBAuth, commentOnPost);

//user route
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:name', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.region('europe-west1').https.onRequest(app);

exports.createNotificationOnVote = functions.region('europe-west1')
	.firestore.document('votes/{id}')
	.onCreate((snapshot) => {
		return db
			.doc(`/posts/${snapshot.data().postId}`)
			.get()
			.then((doc) => {
				if(
					doc.exists &&
					doc.data().userName !== snapshot.data().userName) {
					return db.doc(`/notifications/${snapshot.id}`).set({
						postedAt: new Date().toISOString(),
						recipient: doc.data().userName,
						sender: snapshot.data().userName,
						type: 'vote',
						read: false,
						postId: doc.id
					});
				}
			})
			.catch(err => console.error(err));
	});

exports.deleteNotificationOnUnvote = functions.region('europe-west1')
	.firestore.document('votes/{id}')
	.onDelete((snapshot) => {
		return db
			.doc(`/notifications/${snapshot.id}`)
			.delete()
			.catch(err => {
				console.error(err);
				return;
			})
	})

exports.createNotificationOnComment = functions.region('europe-west1')
	.firestore.document('comments/{id}')
	.onCreate((snapshot) => {
		return db.doc(`/posts/${snapshot.data().postId}`)
			.get()
			.then((doc) => {
				if(
					doc.exists &&
					doc.data().userName !== snapshot.data().userName) {
					return db.doc(`/notifications/${snapshot.id}`).set({
						postedAt: new Date().toISOString(),
						recipient: doc.data().userName,
						sender: snapshot.data().userName,
						type: 'comment',
						read: false,
						postId: doc.id
					});
				}
			})
			.catch(err => {
				console.error(err);
				return;
			});
	});

exports.onUserImageChange = functions
	.region('europe-west1')
	.firestore.document('/users/{userId}')
	.onUpdate((change) => {
		console.log(change.before.data());
		console.log(change.after.data());
		if(change.before.data().imageUrl !== change.after.data().imageUrl) {
			console.log('image has changed');
			const batch = db.batch();
			return db
				.collection('posts')
				.where('userName', '==', change.before.data().name)
				.get()
				.then((data) => {
					data.forEach(doc => {
						const post = db.doc(`/posts/${doc.id}`);
						batch.update(post, {userImage: change.after.data().imageUrl});
					})
					return batch.commit();
				});
		} else return true;
	});

exports.onDeletePost = functions
	.region('europe-west1')
	.firestore.document('/posts/{postId}')
	.onDelete((snapshot, context) => {
		const postId = context.params.postId;
		const batch = db.batch();
		return db
			.collection('comments')
			.where('postId', '==', postId)
			.get()
			.then(data => {
				data.forEach (doc => {
					batch.delete(db.doc(`/comments/${doc.id}`));
				})
				return db
					.collection('votes')
					.where('postId', '==', postId)
					.get()
			})
			.then(data => {
				data.forEach (doc => {
					batch.delete(db.doc(`/votes/${doc.id}`));
				})
				return db
					.collection('notifications')
					.where('postId', '==', postId)
					.get()
			})
			.then(data => {
				data.forEach (doc => {
					batch.delete(db.doc(`/notifications/${doc.id}`));
				})
				return batch.commit();
			})
			.catch(err => console.error(err));
	})