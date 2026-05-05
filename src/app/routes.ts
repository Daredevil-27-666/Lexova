import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./screens/Home";
import { Watch } from "./screens/Watch";
import { ArtistProfile } from "./screens/ArtistProfile";
import { Explore } from "./screens/Explore";
import { Search } from "./screens/Search";
import { Notifications } from "./screens/Notifications";
import { Library } from "./screens/Library";
import { Artists } from "./screens/Artists";
import { Playlist } from "./screens/Playlist";
import { Settings } from "./screens/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "watch/:id", Component: Watch },
      { path: "artist/:id", Component: ArtistProfile },
      { path: "explore", Component: Explore },
      { path: "search", Component: Search },
      { path: "notifications", Component: Notifications },
      { path: "library", Component: Library },
      { path: "artists", Component: Artists },
      { path: "playlist/:playlistId", Component: Playlist },
      { path: "settings", Component: Settings },
    ],
  },
]);