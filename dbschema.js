let db = {
	users: [
		{
			userId: 'C51jRKBJCIYCXHqkYgB5wr2dgmk1',
			email: 'user@email.com',
			name: 'user',
			postedAt: '2019-09-21T13:58:35.911Z',
			imageUrl: 'image/xyznnyvwjy',
			bio: 'Hello, I am ME',
			website: 'https://me.com',
			location: 'City, Country'
		}
	],

	posts: [
		{
			userName: 'user',
			body: 'This is one post',
			postedAt: '2019-09-21T13:58:35.911Z',
			voteCount: 15,
			commentCount: 3
		}
	],
	comments: [
		{
			userName: 'user',
			postId: 'xydfh446454d',
			body: 'This is a comment',
			postedAt: '2019-09-21T13:58:35.911Z'
		}
	],
	notifications: [
		{
			recipient: 'user',
			sender: 'eli',
			read: 'true|false',
			postId: 'xydfh446454d',
			type: 'vote|comment',
			postedAt: '2019-09-21T13:58:35.911Z'
		}
	]
};

const userDetails = {
	//redux data
	credentials: {
		userId: 'C51jRKBJCIYCXHqkYgB5wr2dgmk1',
		email: 'user@email.com',
		name: 'user',
		postedAt: '2019-09-21T13:58:35.911Z',
		imageUrl: 'image/xyznnyvwjy',
		bio: "This is some interesting detail about me",
		website: 'https://me.com',
		location: 'City, Country'
	},

	votes: [
		{
			userName: 'user',
			postId: 'xyznnyvwjy'
		},
		{
			userName: 'user',
			postId: 'xydfh446454d'
		}
	]
}