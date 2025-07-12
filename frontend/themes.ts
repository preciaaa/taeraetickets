// frontend/themes.ts

export type ThemeName = "default" | "pastel" | "pond";

export const THEMES: Record<
  ThemeName,
  {
    name: string;
    backgroundColor: string;
    textColor: string;
    buttonClass: string;
    backgroundImage?: string;
  }
> = {
  default: {
    name: "Default",
    backgroundColor: "bg-white",
    textColor: "text-black",
    buttonClass: "bg-blue-600 text-white hover:bg-blue-700",
  },
  pastel: {
    name: "Pastel Dream",
    backgroundColor: "bg-pink-50",
    textColor: "text-purple-700",
    buttonClass: "bg-pink-400 text-white hover:bg-pink-500",
  },
  pond: {
    name: "Pond with Ducks",
    backgroundColor: "bg-blue-100",
    textColor: "text-green-900",
    buttonClass: "bg-green-600 text-white hover:bg-green-700",
    backgroundImage: "url('/themes/pond-bg.png')", // Add your pond image here in public/themes/
  },
};
