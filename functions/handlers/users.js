const {db, admin} = require('../util/admin');

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config)

const {validateSignupData, validateLoginData, reduceUserDetails} = require('../util/validators');

//user signup
exports.signup = (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password, 
		confirmPassword: req.body.confirmPassword,
		name: req.body.name,
	};

	const { valid, errors } = validateSignupData(newUser);

	if (!valid) return res.status(400).json(errors);

	const noImg = 'no-img.png'

let token, userId;
db.doc(`/users/${newUser.name}`).get()
	.then(doc => {
		if (doc.exists) {
			return res.status(400).json({ name: 'This username is already taken'});
		} else {
			return firebase
				.auth()
				.createUserWithEmailAndPassword(newUser.email, newUser.password);
		}
	})
	.then((data) => {
		userId = data.user.uid;
		return data.user.getIdToken();
	})
	.then((idToken) => {
		token = idToken;
		const userCredentials = {
			name: newUser.name,
			email: newUser.email,
			postedAt: new Date().toISOString(),
			imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
			userId
		};
		return db.doc(`/users/${newUser.name}`).set(userCredentials);
	})
	.then(() => {
		return res.status(201).json({token});
	})
	.catch((err) => {
		console.error(err);
		if (err.code === 'auth/email-already-in-use'){
			return res.status(400).json({email: 'Email is already in use'});
		} else {
			return res.status(500).json({general: 'Something went wrong, please, try again'});
		}
	})
}

//user login
exports.login = (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password
	};

	const { valid, errors } = validateLoginData(user);

	if (!valid) return res.status(400).json(errors);

	firebase
		.auth()
		.signInWithEmailAndPassword(user.email, user.password)
		.then((data) => {
			return data.user.getIdToken();
		})
		.then((token) => {
			return res.json({token});
		})
		.catch((err) => {
			console.error(err);
				return res
					.status(403)
					.json({general: 'Wrong credentials, please try again'});
		});
}

//Add user details
exports.addUserDetails = (req, res) => {
	let userDetails = reduceUserDetails (req.body);

	db.doc(`/users/${req.user.name}`).update(userDetails)
		.then(() => {
			return res.json({message: 'Details added successfully'});
		})
		.catch (err => {
			console.error(err);
			return res.status(500).json({error: err.code});
		})
}

//get any user's details
exports.getUserDetails = (req, res) => {
	let userData = {};
	db.doc(`/users/${req.params.name}`)
		.get()
		.then(doc => {
			if(doc.exists){
				userData.user = doc.data();
				return db.collection('posts')
					.where('userName', '==', req.params.name)
					.orderBy('postedAt', 'desc')
					.get();
			} else {
				return res.status(404).json({error: 'User not found'});
			}
		})
		.then(data => {
			userData.posts = [];
			data.forEach(doc => {
				userData.posts.push({
					body: doc.data().body,
					postedAt: doc.data().postedAt,
					userName: doc.data().userName,
					userImage: doc.data().userImage,
					likeCount: doc.data().likeCount,
					commentCount: doc.data().commentCount,
					postId: doc.id
				})
			});
			return res.json(userData);
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({error: err.code});
		})
}

//get logged in user details
exports.getAuthenticatedUser = (req, res) => {
	let userData = {};
	db.doc(`/users/${req.user.name}`)
		.get()
		.then((doc) => {
			if(doc.exists){
				userData.credentials = doc.data();
				return db
					.collection('votes')
					.where('userName', '==', req.user.name)
					.get()
			}
		})
		.then((data) => {
			userData.votes = [];
			data.forEach((doc) => {
				userData.votes.push(doc.data());
			});
			return db
				.collection('notifications')
				.where('recipient', '==', req.user.name)
				.orderBy('postedAt', 'desc')
				.limit(10)
				.get();
		})
		.then((data) => {
			userData.notifications = [];
			data.forEach((doc) => {
				userData.notifications.push({
					recipient: doc.data().recipient,
					sender: doc.data().sender,
					postedAt: doc.data().postedAt,
					postId: doc.data().postId,
					type: doc.data().type,
					read: doc.data().read,
					notificationId: doc.id
				});
			});
			return res.json(userData);
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({error: err.code});
		})
}

//upload user profile image
exports.uploadImage = (req, res) => {
	const BusBoy = require('busboy');
	const path = require('path');
	const os = require('os');
	const fs = require('fs');

	const busboy = new BusBoy({ headers: req.headers});

	let imageFileName;
	let imageToBeUploaded = {};

	busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
		if(mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
			return res.status(400).json({error: 'Wrong file type submitted'});
		}
		const imageExtension = filename.split('.')[filename.split('.').length-1];

		imageFileName = `${Math.round(Math.random()*100000000000)}.${imageExtension}`;
		const filepath = path.join(os.tmpdir(), imageFileName);
		imageToBeUploaded = {filepath, mimetype};
		file.pipe(fs.createWriteStream(filepath));
	});
	busboy.on('finish', () => {
		admin.storage().bucket().upload(imageToBeUploaded.filepath, {
			resumable: false,
			metadata: {
				metadata: {
					contentType: imageToBeUploaded.mimetype
				}
			}
		})
		.then(() => {
			const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
			return db.doc(`/users/${req.user.name}`).update({imageUrl});
		})
		.then(() => {
			return res.json({message: 'Image uploaded successfully'});
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({error: err.code});
		});
	});
	busboy.end(req.rawBody);
}

//mark notifications as read
exports.markNotificationsRead = (req, res) => {
	let batch = db.batch();
	req.body.forEach(notificationId => {
		const notification = db.doc(`/notifications/${notificationId}`);
		batch.update(notification, {read: true});
	});
	batch.commit()
		.then(() => {
			return res.json({message: 'Notification read'});
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({error: err.code});
		});
}