// UserContext.js
import React, { createContext, useState } from 'react';

// Create a context for the logged-in user
export const UserContext = createContext(null);

// Provider component to wrap your app
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
