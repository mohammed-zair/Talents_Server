import React, { createContext, useContext, useMemo, useState } from 'react';

const StateContext = createContext();

const initialState = {
  notification: false,
  adminActions: false,
  userProfile: false,
};

export const ContextProvider = ({ children }) => {
  const [currentColor, setCurrentColor] = useState(
    localStorage.getItem('colorMode') || '#6366f1'
  );
  const [currentMode, setCurrentMode] = useState(
    localStorage.getItem('themeMode') || 'Light'
  );
  const [activeMenu, setActiveMenu] = useState(true);
  const [screenSize, setScreenSize] = useState(undefined);
  const [isClicked, setIsClicked] = useState(initialState);
  const [themeSettings, setThemeSettings] = useState(false);

  const setMode = (e) => {
    const mode = e.target.value;
    setCurrentMode(mode);
    localStorage.setItem('themeMode', mode);
    setThemeSettings(false);
  };

  const setColor = (color) => {
    setCurrentColor(color);
    localStorage.setItem('colorMode', color);
    setThemeSettings(false);
  };

  const handleClick = (clicked) => {
    setIsClicked({ ...initialState, [clicked]: true });
  };

  const value = useMemo(
    () => ({
      currentColor,
      currentMode,
      activeMenu,
      screenSize,
      themeSettings,
      setActiveMenu,
      setScreenSize,
      setCurrentColor,
      setCurrentMode,
      setThemeSettings,
      setIsClicked,
      setColor,
      setMode,
      handleClick,
      isClicked,
      initialState,
    }),
    [
      currentColor,
      currentMode,
      activeMenu,
      screenSize,
      themeSettings,
      isClicked,
    ]
  );

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
};

export const useStateContext = () => useContext(StateContext);
