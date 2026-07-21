import { useAuth } from '@clerk/react'
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { OnboardingForm } from '../components/OnboardingForm'
import { MatchReportForm } from '../components/MatchReportForm'
import { PendingMatchReport } from '../components/PendingMatchReport'
import { MenuBar } from '../components/MenuBar'
import './styles/HomePage.css'

type Rank = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond'

type rankedpoolUser = {
  _id: string
  clerkId: string
  email: string
  username: string
  rank: Rank
  elo: number
  profilePicture: string
}

type UserResponse = {
  needsOnboarding: boolean;
  user?: rankedpoolUser;
  error?: string;
}

type CreateUserResponse = {
  newUser?: rankedpoolUser;
  existingUser?: rankedpoolUser;
  error?: string;
}

type ProfilePictureResponse = {
  user?: rankedpoolUser;
  error?: string;
}

type PendingMatchReportData = {
  _id: string;
  sender: {
    _id: string
    username: string,
    profilePicture: string,
    rank: Rank,
    elo: number
  },
  receiver: string;
  winner: string;
  loser: string;
  status: 'pending';
  gameType: '8-ball' | '9-ball' | '10-ball';
}

type PendingMatchReportResponse = {
  matchReport: PendingMatchReportData | null;
  error?: string;
}

type RankChangeAnimation = {
  id: number
  direction: 'up' | 'down'
  previousRank: Rank
  newRank: Rank
}

const rankOrder: Rank[] = ['iron', 'bronze', 'silver', 'gold', 'diamond'];
const profilePictureAcceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const profilePictureMaxSize = 3 * 1024 * 1024;
const defaultProfilePicture = 'images/default-profile-pic.png';

const formatRank = (rank: Rank) => rank.toUpperCase();

const getProfilePictureSrc = (profilePicture: string) => {
  if (profilePicture.startsWith('http') || profilePicture.startsWith('/')) {
    return profilePicture;
  }

  return `/${profilePicture}`;
};

const isDefaultProfilePicture = (profilePicture: string) => {
  const normalizedProfilePicture = profilePicture.startsWith('/')
    ? profilePicture.slice(1)
    : profilePicture;

  return normalizedProfilePicture === defaultProfilePicture;
}

const getRankChangeDirection = (previousRank: Rank, newRank: Rank) => {
  const previousRankValue = rankOrder.indexOf(previousRank);
  const newRankValue = rankOrder.indexOf(newRank);

  if (newRankValue > previousRankValue) {
    return 'up';
  }

  if (newRankValue < previousRankValue) {
    return 'down';
  }

  return null;
}

const createImage = (imageSrc: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load selected image'));
    image.src = imageSrc;
  });
}

const createCanvasBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(blob => resolve(blob), type, quality);
  });
}

const getCroppedProfilePictureBlob = async(imageSrc: string, croppedArea: Area) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const outputSize = 512;

  if (!context) {
    throw new Error('Could not prepare image crop');
  }

  canvas.width = outputSize;
  canvas.height = outputSize;

  context.drawImage(
    image,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const webpBlob = await createCanvasBlob(canvas, 'image/webp', 0.9);

  if (webpBlob) {
    return webpBlob;
  }

  const jpegBlob = await createCanvasBlob(canvas, 'image/jpeg', 0.92);

  if (!jpegBlob) {
    throw new Error('Could not prepare image upload');
  }

  return jpegBlob;
}

export function HomePage() {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [loading, setLoading] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [user, setUser] = useState<rankedpoolUser | null>(null);
  const [reportingMatch, setReportingMatch] = useState<boolean>(false);
  const [pendingMatchReport, setPendingMatchReport] = useState<PendingMatchReportData | null>(null);
  const [renderUser, setRenderUser] = useState(0);
  const [rankChangeAnimation, setRankChangeAnimation] = useState<RankChangeAnimation | null>(null);
  const [rankPanelOpen, setRankPanelOpen] = useState(false);
  const previousUserRef = useRef<rankedpoolUser | null>(null);
  const rankAnimationId = useRef(0);
  const profilePictureInputRef = useRef<HTMLInputElement | null>(null);
  const [profilePictureEditorImage, setProfilePictureEditorImage] = useState<string | null>(null);
  const [profilePictureCrop, setProfilePictureCrop] = useState<Point>({ x: 0, y: 0 });
  const [profilePictureZoom, setProfilePictureZoom] = useState(1);
  const [croppedProfilePictureArea, setCroppedProfilePictureArea] = useState<Area | null>(null);
  const [profilePictureError, setProfilePictureError] = useState('');
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [removingProfilePicture, setRemovingProfilePicture] = useState(false);
  const [profilePictureActionOpen, setProfilePictureActionOpen] = useState(false);

  const handleProfilePictureCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedProfilePictureArea(croppedAreaPixels);
  }, []);
  
  // functions for api calls to backend
  const handleCreateUser = async (username: string) => {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/user/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: username,
      }),
    });

    const data = await response.json() as CreateUserResponse;
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    const createdUser = data.newUser || data.existingUser;

    if (!createdUser) {
      throw new Error('Failed to load created user');
    }

    setUser(createdUser);
    previousUserRef.current = createdUser;
    setNeedsOnboarding(false);
  }

  const handleCreateMatchReport = async (username: string, didWin: boolean, gameType: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/match-report`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          didWin,
          gameType
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match report');
      }

      return data;
      
    } catch (error) {
      console.log(error);
    }
  }

  const handleAccept = async (matchReportId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/match-report/${matchReportId}/accept`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept match results');
      }

      setPendingMatchReport(null);
      setRenderUser(prev => prev + 1);

    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  const handleDecline = async (matchReportId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/match-report/${matchReportId}/decline`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline match results');
      }

      setPendingMatchReport(null);
      setRenderUser(prev => prev + 1);

    } catch (error) {
      console.log(error);
      throw error
    }
  }

  const openProfilePicturePicker = () => {
    if (uploadingProfilePicture || removingProfilePicture) {
      return;
    }

    profilePictureInputRef.current?.click();
  }

  const closeProfilePictureActions = useCallback(() => {
    if (removingProfilePicture) {
      return;
    }

    setProfilePictureActionOpen(false);
  }, [removingProfilePicture])

  const handleProfilePictureButtonClick = () => {
    if (uploadingProfilePicture || removingProfilePicture) {
      return;
    }

    setProfilePictureError('');

    if (user && !isDefaultProfilePicture(user.profilePicture)) {
      setProfilePictureActionOpen(true);
      return;
    }

    openProfilePicturePicker();
  }

  const handleChooseNewProfilePicture = () => {
    setProfilePictureActionOpen(false);
    openProfilePicturePicker();
  }

  const closeProfilePictureEditor = useCallback(() => {
    if (uploadingProfilePicture) {
      return;
    }

    setProfilePictureEditorImage(null);
    setCroppedProfilePictureArea(null);
    setProfilePictureCrop({ x: 0, y: 0 });
    setProfilePictureZoom(1);
  }, [uploadingProfilePicture])

  const handleProfilePictureFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!profilePictureAcceptedTypes.includes(selectedFile.type)) {
      setProfilePictureError('Choose a JPG, PNG, or WEBP image.');
      return;
    }

    if (selectedFile.size > profilePictureMaxSize) {
      setProfilePictureError('Profile picture must be 3MB or smaller.');
      return;
    }

    setProfilePictureError('');
    setProfilePictureCrop({ x: 0, y: 0 });
    setProfilePictureZoom(1);
    setCroppedProfilePictureArea(null);
    setProfilePictureEditorImage(URL.createObjectURL(selectedFile));
  }

  const handleProfilePictureUpload = async() => {
    if (!profilePictureEditorImage || !croppedProfilePictureArea) {
      setProfilePictureError('Select the part of your image you want to use.');
      return;
    }

    try {
      setUploadingProfilePicture(true);
      setProfilePictureError('');

      const croppedImageBlob = await getCroppedProfilePictureBlob(
        profilePictureEditorImage,
        croppedProfilePictureArea
      );
      const profilePictureFile = new File(
        [croppedImageBlob],
        `profile-picture.${croppedImageBlob.type === 'image/webp' ? 'webp' : 'jpg'}`,
        { type: croppedImageBlob.type }
      );
      const formData = new FormData();
      formData.append('profilePicture', profilePictureFile);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/user/profile-picture`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json() as ProfilePictureResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile picture');
      }

      if (!data.user) {
        throw new Error('Failed to load updated profile picture');
      }

      previousUserRef.current = data.user;
      setUser(data.user);
      setProfilePictureEditorImage(null);
      setCroppedProfilePictureArea(null);
      setProfilePictureCrop({ x: 0, y: 0 });
      setProfilePictureZoom(1);
    } catch (error) {
      setProfilePictureError(error instanceof Error ? error.message : 'Failed to update profile picture');
    } finally {
      setUploadingProfilePicture(false);
    }
  }

  const handleRemoveProfilePicture = async() => {
    try {
      setRemovingProfilePicture(true);
      setProfilePictureError('');

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/user/profile-picture`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json() as ProfilePictureResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove profile picture');
      }

      if (!data.user) {
        throw new Error('Failed to load updated profile picture');
      }

      previousUserRef.current = data.user;
      setUser(data.user);
      setProfilePictureActionOpen(false);
    } catch (error) {
      setProfilePictureError(error instanceof Error ? error.message : 'Failed to remove profile picture');
    } finally {
      setRemovingProfilePicture(false);
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // get session token from user
        const token = await getToken();
        // send req to backend api to obtain user data to display
        const response = await fetch(`${API_URL}/api/user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json() as UserResponse;
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get user');
        }
        const { needsOnboarding, user } = data;
        setNeedsOnboarding(needsOnboarding);
        if (!needsOnboarding && user) {
          const previousUser = previousUserRef.current;

          if (previousUser && previousUser.rank !== user.rank) {
            const direction = getRankChangeDirection(previousUser.rank, user.rank);

            if (direction) {
              rankAnimationId.current += 1;
              setRankChangeAnimation({
                id: rankAnimationId.current,
                direction,
                previousRank: previousUser.rank,
                newRank: user.rank
              });
            }
          }

          previousUserRef.current = user;
          setUser(user);
        }
  
      } catch (error) {
          console.log(error);
      } finally {
          setLoading(false);  
      }
    }

    const fetchPendingMatchReport = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/match-report/pending`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json() as PendingMatchReportResponse;
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get pending match report');
        }
        const { matchReport } = data;
        setPendingMatchReport(matchReport);
      } catch (error) {
        console.log(error);
      }
    }

    fetchUser();
    fetchPendingMatchReport();
  }, [renderUser, API_URL, getToken])

  useEffect(() => {
    if (!rankChangeAnimation) {
      return;
    }

    const hideRankAnimation = window.setTimeout(() => {
      setRankChangeAnimation(null);
    }, 2600);

    return () => window.clearTimeout(hideRankAnimation);
  }, [rankChangeAnimation])

  useEffect(() => {
    if (!rankPanelOpen) {
      return;
    }

    const closeRankPanel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRankPanelOpen(false);
      }
    }

    window.addEventListener('keydown', closeRankPanel);

    return () => window.removeEventListener('keydown', closeRankPanel);
  }, [rankPanelOpen])

  useEffect(() => {
    if (!profilePictureEditorImage) {
      return;
    }

    const closeProfilePicturePanel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProfilePictureEditor();
      }
    }

    window.addEventListener('keydown', closeProfilePicturePanel);

    return () => window.removeEventListener('keydown', closeProfilePicturePanel);
  }, [profilePictureEditorImage, closeProfilePictureEditor])

  useEffect(() => {
    if (!profilePictureEditorImage) {
      return;
    }

    return () => URL.revokeObjectURL(profilePictureEditorImage);
  }, [profilePictureEditorImage])

  useEffect(() => {
    if (!profilePictureActionOpen) {
      return;
    }

    const closeProfilePictureActionPanel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProfilePictureActions();
      }
    }

    window.addEventListener('keydown', closeProfilePictureActionPanel);

    return () => window.removeEventListener('keydown', closeProfilePictureActionPanel);
  }, [profilePictureActionOpen, closeProfilePictureActions])

  if (loading) {
    return (
      <div className="home-page home-loading-page">
        <div
          className="home-loading-bar"
          role="progressbar"
          aria-label="Loading user data"
        >
          <div className="home-loading-fill"></div>
        </div>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <>
        <OnboardingForm onSubmitUsername={handleCreateUser}/>
      </>
    )
  }

  if (reportingMatch) {
    return (
      <>
        <MatchReportForm onSubmitMatchReport={handleCreateMatchReport}
          onClose={() => setReportingMatch(false)}
        />
      </>
    )
  }

  if (pendingMatchReport !== null) {
    return (
      <>
        <PendingMatchReport 
          newMatchReport={pendingMatchReport}
          handleAccept={handleAccept}
          handleDecline={handleDecline}
        />
      </>
    )
  }

  if (!user) {
    return (
      <div className="home-page home-loading-page">
        <div
          className="home-loading-bar"
          role="progressbar"
          aria-label="Loading user data"
        >
          <div className="home-loading-fill"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="home-page">
        {rankChangeAnimation && (
          <div
            key={rankChangeAnimation.id}
            className={`rank-change-overlay rank-change-${rankChangeAnimation.direction}`}
            role="status"
            aria-live="polite"
          >
            <div className="rank-change-panel">
              <p className="rank-change-kicker">
                {rankChangeAnimation.direction === 'up' ? 'RANK UP' : 'RANK DOWN'}
              </p>
              <img
                className="rank-change-badge"
                src={`/images/rankedpool-${rankChangeAnimation.newRank}.png`}
                alt={`${rankChangeAnimation.newRank} rank`}
              />
              <h2 className="rank-change-title">{formatRank(rankChangeAnimation.newRank)}</h2>
              <p className="rank-change-path">
                {formatRank(rankChangeAnimation.previousRank)} &gt; {formatRank(rankChangeAnimation.newRank)}
              </p>
            </div>
          </div>
        )}
        <div className="user-profile-picture-section">
          <input
            ref={profilePictureInputRef}
            className="profile-picture-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleProfilePictureFileChange}
          />
          <button
            className={`user-profile-picture-button${uploadingProfilePicture || removingProfilePicture ? ' profile-picture-uploading' : ''}`}
            type="button"
            onClick={handleProfilePictureButtonClick}
            disabled={uploadingProfilePicture || removingProfilePicture}
            aria-label="Manage profile picture"
            title="Manage profile picture"
          >
            <img
              className="user-profile-pic"
              src={getProfilePictureSrc(user.profilePicture)}
              alt={`${user.username} profile`}
            />
            <span className="profile-picture-edit-badge" aria-hidden="true">+</span>
          </button>
          {profilePictureError && !profilePictureEditorImage && !profilePictureActionOpen && (
            <p className="profile-picture-error" role="alert">{profilePictureError}</p>
          )}
        </div>
        <h2 className="user-username">{user.username}</h2>
        <div className="container">
          <button
            className="user-rank-button"
            type="button"
            onClick={() => setRankPanelOpen(true)}
            aria-label="View rank ladder"
          >
            <img className="user-rank-image" src={`/images/rankedpool-${user.rank}.png`} alt={`${user.rank} rank`}/>
            <p className="user-rank-label">{`${user.rank}`}</p>
          </button>
          <div className="elo-bar">
            <div className="elo-fill" style={{width: `${user.elo}%`}}></div>
          </div>
          <p className="elo-rating">{`${user.elo}`} / 100</p>
          <button className="report-match" onClick={() => setReportingMatch(true)}>Report Match</button>
        </div>
        {rankPanelOpen && (
          <div
            className="rank-modal-backdrop"
            onClick={() => setRankPanelOpen(false)}
          >
            <section
              className="rank-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rank-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="rank-modal-close"
                type="button"
                onClick={() => setRankPanelOpen(false)}
                aria-label="Close rank ladder"
              >
                x
              </button>
              <h2 className="rank-modal-title" id="rank-modal-title">Rank ladder</h2>
              <div className="rank-modal-track" aria-label="iron to diamond rank order">
                {rankOrder.map((rank, index) => (
                  <div className="rank-modal-progress-segment" key={rank}>
                    <div className={`rank-modal-rank${user.rank === rank ? ' current-rank' : ''}`}>
                      <img
                        className="rank-modal-badge"
                        src={`/images/rankedpool-${rank}.png`}
                        alt={`${rank} rank`}
                      />
                      <span className="rank-modal-rank-name">{rank}</span>
                      {user.rank === rank && (
                        <span className="rank-modal-current-label">current</span>
                      )}
                    </div>
                    {index < rankOrder.length - 1 && (
                      <span className="rank-modal-arrow" aria-hidden="true">&gt;</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {profilePictureActionOpen && (
          <div
            className="profile-picture-action-backdrop"
            onClick={closeProfilePictureActions}
          >
            <section
              className="profile-picture-action-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-picture-action-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="profile-picture-action-title" id="profile-picture-action-title">
                Profile picture
              </h2>
              <div className="profile-picture-action-buttons">
                <button
                  className="profile-picture-danger-button"
                  type="button"
                  onClick={handleRemoveProfilePicture}
                  disabled={removingProfilePicture}
                >
                  {removingProfilePicture ? 'Removing...' : 'Remove current'}
                </button>
                <button
                  className="profile-picture-primary-button"
                  type="button"
                  onClick={handleChooseNewProfilePicture}
                  disabled={removingProfilePicture}
                >
                  Choose new
                </button>
                <button
                  className="profile-picture-secondary-button"
                  type="button"
                  onClick={closeProfilePictureActions}
                  disabled={removingProfilePicture}
                >
                  Cancel
                </button>
              </div>
              {profilePictureError && (
                <p className="profile-picture-error profile-picture-modal-error" role="alert">
                  {profilePictureError}
                </p>
              )}
            </section>
          </div>
        )}
        {profilePictureEditorImage && (
          <div
            className="profile-picture-modal-backdrop"
            onClick={closeProfilePictureEditor}
          >
            <section
              className="profile-picture-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-picture-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="profile-picture-modal-close"
                type="button"
                onClick={closeProfilePictureEditor}
                disabled={uploadingProfilePicture}
                aria-label="Close profile picture editor"
              >
                x
              </button>
              <h2 className="profile-picture-modal-title" id="profile-picture-modal-title">
                Profile picture
              </h2>
              <div className="profile-picture-cropper">
                <Cropper
                  image={profilePictureEditorImage}
                  crop={profilePictureCrop}
                  zoom={profilePictureZoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setProfilePictureCrop}
                  onCropAreaChange={handleProfilePictureCropComplete}
                  onCropComplete={handleProfilePictureCropComplete}
                  onZoomChange={setProfilePictureZoom}
                />
              </div>
              <label className="profile-picture-zoom-label" htmlFor="profile-picture-zoom">
                Zoom
              </label>
              <input
                className="profile-picture-zoom-slider"
                id="profile-picture-zoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={profilePictureZoom}
                onChange={(event) => setProfilePictureZoom(Number(event.target.value))}
              />
              {profilePictureError && (
                <p className="profile-picture-error profile-picture-modal-error" role="alert">
                  {profilePictureError}
                </p>
              )}
              <div className="profile-picture-modal-actions">
                <button
                  className="profile-picture-secondary-button"
                  type="button"
                  onClick={closeProfilePictureEditor}
                  disabled={uploadingProfilePicture}
                >
                  Cancel
                </button>
                <button
                  className="profile-picture-primary-button"
                  type="button"
                  onClick={handleProfilePictureUpload}
                  disabled={uploadingProfilePicture || !croppedProfilePictureArea}
                >
                  {uploadingProfilePicture ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </section>
          </div>
        )}
        <MenuBar />
      </div>
    </>
  )
}
