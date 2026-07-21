import express from 'express'
import {
    acceptFriendRequest,
    declineFriendRequest,
    getFriendRequests,
    getFriends,
    removeFriend,
    searchFriends,
    sendFriendRequest
} from '../controllers/friendController'

const router = express.Router();

router.get('/friends', getFriends);
router.get('/friends/search', searchFriends);
router.get('/friends/requests', getFriendRequests);
router.post('/friends/:friendId/request', sendFriendRequest);
router.delete('/friends/:friendId', removeFriend);
router.patch('/friends/requests/:requestId/accept', acceptFriendRequest);
router.patch('/friends/requests/:requestId/decline', declineFriendRequest);

export default router;
