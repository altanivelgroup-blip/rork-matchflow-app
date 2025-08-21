import createContextHook from "@nkzw/create-context-hook";
import { useState } from "react";

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  interests: string[];
}

export const [MatchProvider, useMatches] = createContextHook(() => {
  const [matches, setMatches] = useState<Profile[]>([]);

  const addMatch = (profile: Profile) => {
    setMatches((prev) => {
      if (prev.find((m) => m.id === profile.id)) {
        return prev;
      }
      return [...prev, profile];
    });
  };

  const removeMatch = (profileId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== profileId));
  };

  return {
    matches,
    addMatch,
    removeMatch,
  };
});