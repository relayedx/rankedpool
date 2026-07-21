import { useAuth } from '@clerk/react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { MenuBar } from '../components/MenuBar'
import './styles/FriendsPage.css'

type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond';
type RelationshipStatus = 'none' | 'friend' | 'outgoing_pending' | 'incoming_pending';
type FriendRequestAction = 'accept' | 'decline';

type Player = {
  _id: string;
  username: string;
  rank: Rank;
  elo: number;
  profilePicture: string;
};

type SearchPlayer = Player & {
  relationshipStatus: RelationshipStatus;
};

type FriendRequest = {
  _id: string;
  sender: Player;
  receiver: Player;
  status: 'pending';
  createdAt: string;
};

type UserResponse = {
  needsOnboarding: boolean;
  user?: Player;
  error?: string;
};

type FriendsResponse = {
  friends?: Player[];
  error?: string;
};

type SearchResponse = {
  users?: SearchPlayer[];
  error?: string;
};

type SendFriendRequestResponse = {
  relationshipStatus?: RelationshipStatus;
  error?: string;
};

type FriendRequestsResponse = {
  incoming?: FriendRequest[];
  outgoing?: FriendRequest[];
  error?: string;
};

type FriendRequestResponse = {
  error?: string;
};

type RemoveFriendResponse = {
  removedFriendId?: string;
  error?: string;
};

const formatRank = (rank: Rank) => rank.toUpperCase();

const getProfilePictureSrc = (profilePicture: string) => {
  if (profilePicture.startsWith('http') || profilePicture.startsWith('/')) {
    return profilePicture;
  }

  return `/${profilePicture}`;
};

const getSearchActionLabel = (player: SearchPlayer, isRequesting: boolean) => {
  if (isRequesting) {
    return 'Sending';
  }

  if (player.relationshipStatus === 'friend') {
    return 'Added';
  }

  if (player.relationshipStatus === 'outgoing_pending') {
    return 'Pending';
  }

  if (player.relationshipStatus === 'incoming_pending') {
    return 'Respond';
  }

  return 'Add';
}

export function FriendsPage() {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [friends, setFriends] = useState<Player[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [activeSearchUsername, setActiveSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [requestingPlayerId, setRequestingPlayerId] = useState('');
  const [respondingRequestId, setRespondingRequestId] = useState('');
  const [removingFriendId, setRemovingFriendId] = useState('');
  const [pendingRequestsOpen, setPendingRequestsOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const trimmedSearchUsername = searchUsername.trim();
  const showingSearchResults = activeSearchUsername.length > 0;
  const pendingRequestCount = incomingRequests.length + outgoingRequests.length;

  const fetchFriends = useCallback(async() => {
    const token = await getToken();

    const userResponse = await fetch(`${API_URL}/api/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = await userResponse.json() as UserResponse;

    if (!userResponse.ok) {
      throw new Error(userData.error || 'Failed to get user');
    }

    if (userData.needsOnboarding || !userData.user) {
      throw new Error('Create your profile before adding friends');
    }

    setCurrentUserId(userData.user._id);

    const friendsResponse = await fetch(`${API_URL}/api/friends`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const friendsData = await friendsResponse.json() as FriendsResponse;

    if (!friendsResponse.ok) {
      throw new Error(friendsData.error || 'Failed to get friends');
    }

    setFriends(friendsData.friends ?? []);
  }, [API_URL, getToken])

  const fetchFriendRequests = useCallback(async() => {
    const token = await getToken();
    const friendRequestsResponse = await fetch(`${API_URL}/api/friends/requests`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const friendRequestsData = await friendRequestsResponse.json() as FriendRequestsResponse;

    if (!friendRequestsResponse.ok) {
      throw new Error(friendRequestsData.error || 'Failed to get friend requests');
    }

    setIncomingRequests(friendRequestsData.incoming ?? []);
    setOutgoingRequests(friendRequestsData.outgoing ?? []);
  }, [API_URL, getToken])

  const refreshFriendData = useCallback(async() => {
    await Promise.all([
      fetchFriends(),
      fetchFriendRequests()
    ]);
  }, [fetchFriends, fetchFriendRequests])

  const handleSearch = async(event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedSearchUsername) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError('');

      const token = await getToken();
      const searchResponse = await fetch(
        `${API_URL}/api/friends/search?username=${encodeURIComponent(trimmedSearchUsername)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const searchData = await searchResponse.json() as SearchResponse;

      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Failed to search players');
      }

      setActiveSearchUsername(trimmedSearchUsername);
      setSearchResults(searchData.users ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search players');
    } finally {
      setIsSearching(false);
    }
  }

  const clearSearch = () => {
    setSearchUsername('');
    setActiveSearchUsername('');
    setSearchResults([]);
    setError('');
  }

  const handleSendFriendRequest = async(player: SearchPlayer) => {
    if (player.relationshipStatus === 'incoming_pending') {
      setPendingRequestsOpen(true);
      return;
    }

    try {
      setRequestingPlayerId(player._id);
      setError('');

      const token = await getToken();
      const friendRequestResponse = await fetch(`${API_URL}/api/friends/${player._id}/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const friendRequestData = await friendRequestResponse.json() as SendFriendRequestResponse;

      if (!friendRequestResponse.ok) {
        throw new Error(friendRequestData.error || 'Failed to send friend request');
      }

      setSearchResults(prevResults => prevResults.map(searchPlayer => {
        if (searchPlayer._id !== player._id) {
          return searchPlayer;
        }

        return {
          ...searchPlayer,
          relationshipStatus: friendRequestData.relationshipStatus ?? 'outgoing_pending'
        };
      }));

      await fetchFriendRequests();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send friend request');
    } finally {
      setRequestingPlayerId('');
    }
  }

  const handleFriendRequestAction = async(requestId: string, action: FriendRequestAction) => {
    const friendRequest = incomingRequests.find(request => request._id === requestId);

    try {
      setRespondingRequestId(`${action}-${requestId}`);
      setError('');

      const token = await getToken();
      const friendRequestResponse = await fetch(`${API_URL}/api/friends/requests/${requestId}/${action}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const friendRequestData = await friendRequestResponse.json() as FriendRequestResponse;

      if (!friendRequestResponse.ok) {
        throw new Error(friendRequestData.error || `Failed to ${action} friend request`);
      }

      await refreshFriendData();

      if (friendRequest) {
        setSearchResults(prevResults => prevResults.map(player => {
          if (player._id !== friendRequest.sender._id) {
            return player;
          }

          return {
            ...player,
            relationshipStatus: action === 'accept' ? 'friend' : 'none'
          };
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : `Failed to ${action} friend request`);
    } finally {
      setRespondingRequestId('');
    }
  }

  const handleRemoveFriend = async(friendId: string) => {
    try {
      setRemovingFriendId(friendId);
      setError('');

      const token = await getToken();
      const removeFriendResponse = await fetch(`${API_URL}/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const removeFriendData = await removeFriendResponse.json() as RemoveFriendResponse;

      if (!removeFriendResponse.ok) {
        throw new Error(removeFriendData.error || 'Failed to remove friend');
      }

      setFriends(prevFriends => prevFriends.filter(friend => friend._id !== friendId));
      setSearchResults(prevResults => prevResults.map(player => {
        if (player._id !== friendId) {
          return player;
        }

        return {
          ...player,
          relationshipStatus: 'none'
        };
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove friend');
    } finally {
      setRemovingFriendId('');
    }
  }

  useEffect(() => {
    const loadFriends = async() => {
      try {
        setError('');
        await refreshFriendData();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load friends');
      } finally {
        setLoading(false);
      }
    }

    loadFriends();
  }, [refreshFriendData])

  if (loading) {
    return (
      <div className="friends-page">
        <div className="friends-state" role="status">
          Loading friends...
        </div>
        <MenuBar />
      </div>
    )
  }

  return (
    <div className="friends-page">
      <header className="friends-header">
        <p className="friends-kicker">rankedpool circle</p>
        <h1>Friends</h1>
      </header>

      <main className="friends-board" aria-labelledby="friends-title">
        <form className="friends-search" onSubmit={handleSearch}>
          <label className="friends-search-label" htmlFor="friends-search-input">
            Search players
          </label>
          <div className="friends-search-row">
            <input
              id="friends-search-input"
              className="friends-search-input"
              type="search"
              value={searchUsername}
              onChange={(event) => {
                const nextSearchUsername = event.target.value;
                setSearchUsername(nextSearchUsername);

                if (!nextSearchUsername.trim()) {
                  setActiveSearchUsername('');
                  setSearchResults([]);
                  setError('');
                }
              }}
              placeholder="Search username"
              autoComplete="off"
            />
            <button
              className="friends-search-button"
              type="submit"
              disabled={isSearching || !trimmedSearchUsername}
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </div>
          <div className="friends-search-actions">
            <button
              className="friends-pending-toggle"
              type="button"
              onClick={() => setPendingRequestsOpen(prev => !prev)}
            >
              {pendingRequestsOpen ? 'Hide pending friend requests' : 'View pending friend requests'}
              {pendingRequestCount > 0 && (
                <span>{pendingRequestCount}</span>
              )}
            </button>
            {showingSearchResults && (
              <button className="friends-clear-search" type="button" onClick={clearSearch}>
                Show my friends
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="friends-inline-error" role="alert">
            {error}
          </div>
        )}

        {pendingRequestsOpen && (
          <section className="friends-requests-panel" aria-labelledby="friends-requests-title">
            <div className="friends-title-row">
              <h2 id="friends-requests-title">Pending Requests</h2>
              <span>{pendingRequestCount} total</span>
            </div>

            <div className="friends-request-group">
              <h3>Incoming</h3>
              {incomingRequests.length === 0 ? (
                <p className="friends-request-empty">No incoming requests.</p>
              ) : (
                <div className="friends-request-list">
                  {incomingRequests.map(request => (
                    <article className="friends-row friend-request-row" key={request._id}>
                      <img
                        className="friends-profile-picture"
                        src={getProfilePictureSrc(request.sender.profilePicture)}
                        alt={`${request.sender.username} profile`}
                      />
                      <div className="friends-search-player">
                        <p>{request.sender.username}</p>
                        <span>{formatRank(request.sender.rank)} · {request.sender.elo} elo</span>
                      </div>
                      <div className="friend-request-actions">
                        <button
                          className="friend-request-accept"
                          type="button"
                          onClick={() => handleFriendRequestAction(request._id, 'accept')}
                          disabled={respondingRequestId === `accept-${request._id}` || respondingRequestId === `decline-${request._id}`}
                        >
                          {respondingRequestId === `accept-${request._id}` ? '...' : 'Accept'}
                        </button>
                        <button
                          className="friend-request-decline"
                          type="button"
                          onClick={() => handleFriendRequestAction(request._id, 'decline')}
                          disabled={respondingRequestId === `accept-${request._id}` || respondingRequestId === `decline-${request._id}`}
                        >
                          {respondingRequestId === `decline-${request._id}` ? '...' : 'Decline'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="friends-request-group">
              <h3>Outgoing</h3>
              {outgoingRequests.length === 0 ? (
                <p className="friends-request-empty">No outgoing requests.</p>
              ) : (
                <div className="friends-request-list">
                  {outgoingRequests.map(request => (
                    <article className="friends-row friend-request-row outgoing-request-row" key={request._id}>
                      <img
                        className="friends-profile-picture"
                        src={getProfilePictureSrc(request.receiver.profilePicture)}
                        alt={`${request.receiver.username} profile`}
                      />
                      <div className="friends-search-player">
                        <p>{request.receiver.username}</p>
                        <span>{formatRank(request.receiver.rank)} · {request.receiver.elo} elo</span>
                      </div>
                      <span className="friend-request-status">Pending</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {showingSearchResults ? (
          <section className="friends-section" aria-labelledby="friends-search-title">
            <div className="friends-title-row">
              <h2 id="friends-search-title">Search results</h2>
              <span>{searchResults.length} found</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="friends-empty-state">
                {isSearching ? 'Searching...' : 'No players found.'}
              </div>
            ) : (
              <div className="friends-list">
                {searchResults.map(player => {
                  const isRequestingPlayer = requestingPlayerId === player._id;
                  const isSearchActionDisabled =
                    player.relationshipStatus === 'friend' ||
                    player.relationshipStatus === 'outgoing_pending' ||
                    isRequestingPlayer;

                  return (
                    <article className="friends-row search-result-row" key={player._id}>
                      <img
                        className="friends-profile-picture"
                        src={getProfilePictureSrc(player.profilePicture)}
                        alt={`${player.username} profile`}
                      />
                      <div className="friends-search-player">
                        <p>{player.username}</p>
                        <span>{formatRank(player.rank)} · {player.elo} elo</span>
                      </div>
                      <button
                        className="friends-add-button"
                        type="button"
                        onClick={() => handleSendFriendRequest(player)}
                        disabled={isSearchActionDisabled}
                      >
                        {getSearchActionLabel(player, isRequestingPlayer)}
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="friends-section" aria-labelledby="friends-title">
            <div className="friends-title-row">
              <h2 id="friends-title">Friend Rankings</h2>
              <span>{friends.length} added</span>
            </div>

            {friends.length === 0 ? (
              <div className="friends-empty-state">
                Search for players to start building your friends list.
              </div>
            ) : (
              <div className="friends-list">
                {friends.map((friend, index) => {
                  const placement = index + 1;
                  const isCurrentUser = friend._id === currentUserId;
                  const isPodiumPlayer = placement <= 3;
                  const isRemovingFriend = removingFriendId === friend._id;

                  return (
                    <article
                      className={`friends-row friend-ranking-row${isCurrentUser ? ' current-player' : ''}${isPodiumPlayer ? ' podium-player' : ''}`}
                      key={friend._id}
                    >
                      <img
                        className="friends-rank-badge"
                        src={`/images/rankedpool-${friend.rank}.png`}
                        alt={`${friend.rank} rank`}
                      />
                      <div className="friends-elo">
                        <span>{friend.elo}</span>
                        <small>elo</small>
                      </div>
                      <div className="friends-player">
                        <p>{friend.username}</p>
                        <span>{formatRank(friend.rank)}</span>
                      </div>
                      <div className="friend-row-actions">
                        <span className="friends-placement">#{placement}</span>
                        <button
                          className="friends-remove-button"
                          type="button"
                          onClick={() => handleRemoveFriend(friend._id)}
                          disabled={isRemovingFriend}
                        >
                          {isRemovingFriend ? '...' : 'Remove'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <MenuBar />
    </div>
  )
}
