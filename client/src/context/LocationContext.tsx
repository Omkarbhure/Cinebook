'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocationContextType {
  city: string;
  setCity: (city: string) => void;
  availableCities: string[];
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [city, setCityState] = useState<string>('');
  const availableCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'];

  useEffect(() => {
    const savedCity = localStorage.getItem('cinebook_city');
    if (savedCity) {
      setCityState(savedCity);
    }
  }, []);

  const setCity = (newCity: string) => {
    setCityState(newCity);
    localStorage.setItem('cinebook_city', newCity);
  };

  return (
    <LocationContext.Provider value={{ city, setCity, availableCities }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
};
