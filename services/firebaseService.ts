import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out", error);
    throw error;
  }
};

const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const uploadProfilePicture = async (user: User, file: File): Promise<string> => {
  try {
    const base64Image = await compressImageToBase64(file);
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { customPhotoURL: base64Image }, { merge: true });
    return base64Image;
  } catch (error) {
    console.error("Error saving profile picture to database", error);
    throw error;
  }
};

export const getUserData = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? docSnap.data() : null;
};

import { BudgetData, PortfolioItem, Goal } from '../types';

export const syncWatchlistToCloud = async (userId: string, localWatchlist: string[]): Promise<string[]> => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists()) {
    const cloudWatchlist = docSnap.data().watchlist || [];
    // Merge and deduplicate
    const mergedSet = new Set([...cloudWatchlist, ...localWatchlist]);
    const merged = Array.from(mergedSet);
    
    await setDoc(userRef, { watchlist: merged }, { merge: true });
    return merged;
  } else {
    await setDoc(userRef, { watchlist: localWatchlist }, { merge: true });
    return localWatchlist;
  }
};

export const updateCloudWatchlist = async (userId: string, watchlist: string[]) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { watchlist }, { merge: true });
};

export const syncPortfolioToCloud = async (userId: string, localPortfolio: PortfolioItem[]): Promise<PortfolioItem[]> => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().portfolio && docSnap.data().portfolio.length > 0) {
    const cloudPortfolio = docSnap.data().portfolio;
    if (!localPortfolio || localPortfolio.length === 0) {
        return cloudPortfolio;
    }
    await setDoc(userRef, { portfolio: localPortfolio }, { merge: true });
    return localPortfolio;
  } else if (localPortfolio && localPortfolio.length > 0) {
    await setDoc(userRef, { portfolio: localPortfolio }, { merge: true });
    return localPortfolio;
  }
  return [];
};

export const updateCloudPortfolio = async (userId: string, portfolio: PortfolioItem[]) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { portfolio }, { merge: true });
};

export const syncBudgetToCloud = async (userId: string, localBudget: BudgetData | null): Promise<BudgetData | null> => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().budget) {
    // Cloud has budget data, prefer cloud over local if local is empty
    const cloudBudget = docSnap.data().budget;
    if (!localBudget || (localBudget.revenue === 0 && localBudget.categories.length === 0)) {
        return cloudBudget;
    }
    // If local has data, just overwrite cloud for simplicity in this version
    await setDoc(userRef, { budget: localBudget }, { merge: true });
    return localBudget;
  } else if (localBudget) {
    await setDoc(userRef, { budget: localBudget }, { merge: true });
    return localBudget;
  }
  return null;
};

export const updateCloudBudget = async (userId: string, budget: BudgetData) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { budget }, { merge: true });
};

export const syncGoalsToCloud = async (userId: string, localGoals: Goal[]): Promise<Goal[]> => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().goals) {
    const cloudGoals = docSnap.data().goals;
    if (!localGoals || localGoals.length === 0) {
        return cloudGoals;
    }
    await setDoc(userRef, { goals: localGoals }, { merge: true });
    return localGoals;
  } else if (localGoals && localGoals.length > 0) {
    await setDoc(userRef, { goals: localGoals }, { merge: true });
    return localGoals;
  }
  return [];
};

export const updateCloudGoals = async (userId: string, goals: Goal[]) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { goals }, { merge: true });
};
