import "./styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Root from "./routes/root";
import ErrorPage from "./error-page";
import { Showcase } from "./routes/0-showcase";
import { Basic } from "./routes/1-basic";
import { Messy } from "./routes/3-messy";
import { NoDragging } from "./routes/2-no-dragging";
import { GridProperty } from "./routes/4-grid-property";
import { StaticElements } from "./routes/5-static-elements";
import { DynamicAddRemove } from "./routes/6-dynamic-add-remove";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "0-showcase",
        element: <Showcase />
      },
      {
        path: "1-basic",
        element: <Basic />
      },
      {
        path: "2-no-dragging",
        element: <NoDragging />
      },
      {
        path: "3-messy",
        element: <Messy />
      },
      {
        path: "4-grid-property",
        element: <GridProperty />
      },
      {
        path: "5-static-elements",
        element: <StaticElements />
      },
      {
        path: "6-dynamic-add-remove",
        element: <DynamicAddRemove />
      }
      // {
      //   path: "7-localstorage",
      //   element: <Localstorage />
      // },
      // {
      //   path: "9-min-max-wh",
      //   element: <MinMaxWh />
      // },
      // {
      //   path: "10-dynamic-min-max-wh",
      //   element: <DynamicMinMaxWh />
      // },
      // {
      //   path: "11-no-vertical-compact",
      //   element: <NoVerticalCompact />
      // },
      // {
      //   path: "12-prevent-collision",
      //   element: <PreventCollision />
      // },
      // {
      //   path: "13-error-case",
      //   element: <ErrorCase />
      // },
      // {
      //   path: "14-toolbox",
      //   element: <Toolbox />
      // },
      // {
      //   path: "15-drag-from-outside",
      //   element: <DragFromOutside />
      // },
      // {
      //   path: "16-bounded",
      //   element: <Bounded />
      // },
      // {
      //   path: "17-responsive-bootstrap-style",
      //   element: <ResponsiveBootstrapStyle />
      // },
      // {
      //   path: "18-scale",
      //   element: <Scale />
      // },
      // {
      //   path: "19-allow-overlap",
      //   element: <AllowOverlap />
      // },
      // {
      //   path: "20-resizable-handles",
      //   element: <ResizableHandles />
      // },
      // {
      //   path: "21-horizontal",
      //   element: <Horizontal />
      // },
      // {
      //   path: "22-dndkit",
      //   element: <Dndkit />
      // }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
