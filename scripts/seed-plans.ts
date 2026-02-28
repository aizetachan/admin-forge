import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Load env from .env
import 'dotenv/config';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PLANS = {
    free: {
        name: 'Free',
        tier: 1,
        priceMonthly: 0,
        priceYearly: 0,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        trialDays: 0,
        features: {
            repos: { enabled: true, limit: 1 },
            componentsPerRepo: { enabled: true, limit: 20 },
            aiMessages: { enabled: false, limit: 0 },
            aiGenerations: { enabled: false, limit: 0 },
            exportCode: { enabled: true, limit: 99999999 },
            teamMembers: { enabled: true, limit: 1 },
            prioritySupport: { enabled: false, limit: 0 },
        },
    },
    pro: {
        name: 'Pro',
        tier: 2,
        priceMonthly: 1200,
        priceYearly: 11500,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        trialDays: 7,
        features: {
            repos: { enabled: true, limit: 5 },
            componentsPerRepo: { enabled: true, limit: 99999999 },
            aiMessages: { enabled: true, limit: 200 },
            aiGenerations: { enabled: true, limit: 50 },
            exportCode: { enabled: true, limit: 99999999 },
            teamMembers: { enabled: true, limit: 1 },
            prioritySupport: { enabled: false, limit: 0 },
        },
    },
    team: {
        name: 'Team',
        tier: 3,
        priceMonthly: 2900,
        priceYearly: 27800,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        trialDays: 0,
        features: {
            repos: { enabled: true, limit: 99999999 },
            componentsPerRepo: { enabled: true, limit: 99999999 },
            aiMessages: { enabled: true, limit: 1000 },
            aiGenerations: { enabled: true, limit: 200 },
            exportCode: { enabled: true, limit: 99999999 },
            teamMembers: { enabled: true, limit: 10 },
            prioritySupport: { enabled: true, limit: 99999999 },
        },
    },
    enterprise: {
        name: 'Enterprise',
        tier: 4,
        priceMonthly: 0,
        priceYearly: 0,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        trialDays: 0,
        features: {
            repos: { enabled: true, limit: 99999999 },
            componentsPerRepo: { enabled: true, limit: 99999999 },
            aiMessages: { enabled: true, limit: 99999999 },
            aiGenerations: { enabled: true, limit: 99999999 },
            exportCode: { enabled: true, limit: 99999999 },
            teamMembers: { enabled: true, limit: 99999999 },
            prioritySupport: { enabled: true, limit: 99999999 },
        },
    },
};

async function seed() {
    console.log('Seeding /plans collection...');
    for (const [id, data] of Object.entries(PLANS)) {
        await setDoc(doc(db, 'plans', id), data);
        console.log(`  ✓ plans/${id}`);
    }
    console.log('Done!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
