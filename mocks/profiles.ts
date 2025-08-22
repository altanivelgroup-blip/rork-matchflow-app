export interface MockProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  interests: string[];
  likedYou: boolean;
  location?: { lat: number; lon: number; city?: string };
  faceVector?: number[];
  faceScoreFromVerification?: number;
}

export const mockProfiles: MockProfile[] = [
  {
    id: "1",
    name: "Emma",
    age: 28,
    bio: "Yoga enthusiast, foodie, and sunset chaser. Looking for someone to explore the city with!",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
    interests: ["Yoga", "Travel", "Photography", "Cooking"],
    likedYou: true,
    location: { lat: 37.7749, lon: -122.4194, city: "San Francisco" },
    faceScoreFromVerification: 0.92,
  },
  {
    id: "2",
    name: "Michael",
    age: 32,
    bio: "Adventure seeker and coffee addict. Let's grab a drink and see where it goes!",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    interests: ["Hiking", "Coffee", "Music", "Reading"],
    likedYou: false,
    location: { lat: 34.0522, lon: -118.2437, city: "Los Angeles" },
    faceScoreFromVerification: 0.75,
  },
  {
    id: "3",
    name: "Sophia",
    age: 26,
    bio: "Artist by day, Netflix binger by night. Looking for my partner in crime!",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800",
    interests: ["Art", "Movies", "Wine", "Dancing"],
    likedYou: true,
    location: { lat: 37.3382, lon: -121.8863, city: "San Jose" },
    faceScoreFromVerification: 0.88,
  },
  {
    id: "4",
    name: "James",
    age: 29,
    bio: "Fitness enthusiast and dog lover. Swipe right if you love adventures!",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    interests: ["Fitness", "Dogs", "Traveling", "Sports"],
    likedYou: false,
    location: { lat: 36.1699, lon: -115.1398, city: "Las Vegas" },
  },
  {
    id: "5",
    name: "Olivia",
    age: 31,
    bio: "Bookworm, wine enthusiast, and aspiring chef. Let's cook together!",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
    interests: ["Reading", "Cooking", "Wine Tasting", "Gardening"],
    likedYou: true,
    location: { lat: 37.8044, lon: -122.2712, city: "Oakland" },
    faceScoreFromVerification: 0.95,
  },
  {
    id: "6",
    name: "Daniel",
    age: 27,
    bio: "Tech geek with a passion for music. Looking for someone who gets my nerdy jokes!",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
    interests: ["Technology", "Gaming", "Music", "Podcasts"],
    likedYou: false,
    location: { lat: 47.6062, lon: -122.3321, city: "Seattle" },
  },
  {
    id: "7",
    name: "Isabella",
    age: 25,
    bio: "Beach lover and sunset photographer. Life's too short for boring dates!",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    interests: ["Beach", "Photography", "Surfing", "Yoga"],
    likedYou: false,
    location: { lat: 32.7157, lon: -117.1611, city: "San Diego" },
  },
  {
    id: "8",
    name: "Alexander",
    age: 30,
    bio: "World traveler and food explorer. 20 countries and counting!",
    image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=800",
    interests: ["Travel", "Food", "Languages", "History"],
    likedYou: true,
    location: { lat: 40.7128, lon: -74.006, city: "New York" },
    faceScoreFromVerification: 0.83,
  },
];
