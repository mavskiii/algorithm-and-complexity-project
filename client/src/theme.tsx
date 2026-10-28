import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
type Theme = 'light' | 'dark';
const ThemeContext = createContext<{theme:Theme;toggle:()=>void}>({theme:'light',toggle:()=>{}});
export function ThemeProvider({children}:{children:ReactNode}) {
  const [theme,setTheme]=useState<Theme>(()=>{
    try {const saved=localStorage.getItem('group4-theme');if(saved==='light'||saved==='dark')return saved;}catch{}
    return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  });
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem('group4-theme',theme)}catch{}},[theme]);
  return <ThemeContext.Provider value={{theme,toggle:()=>setTheme(t=>t==='dark'?'light':'dark')}}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
