import React from "react";
import { Outlet, Link } from "react-router-dom";

export default function Root() {
  return (
    <>
      <div id="sidebar">
        <h1>React Router Contacts</h1>
        <nav>
          <ul className="flex items-center flex-row flex-wrap space-x-1">
            <li>
              <Link to="0-showcase">0</Link>
            </li>
            <li>
              <Link to="1-basic">1</Link>
            </li>
            <li>
              <Link to="2-no-dragging">2</Link>
            </li>
            <li>
              <Link to="3-messy">3</Link>
            </li>
            <li>
              <Link to="4-grid-property">4</Link>
            </li>
            <li>
              <Link to="5-static-elements">5</Link>
            </li>
            <li>
              <Link to="6-dynamic-add-remove">6</Link>
            </li>
            <li>
              <Link to="7-localstorage">7</Link>
            </li>
            <li>
              <Link to="9-min-max-wh">9</Link>
            </li>
            <li>
              <Link to="10-dynamic-min-max-wh">10</Link>
            </li>
            <li>
              <Link to="11-no-vertical-compact">11</Link>
            </li>
            <li>
              <Link to="12-prevent-collision">12</Link>
            </li>
            <li>
              <Link to="13-error-case">13</Link>
            </li>
            <li>
              <Link to="14-toolbox">14</Link>
            </li>
            <li>
              <Link to="15-drag-from-outside">15</Link>
            </li>
            <li>
              <Link to="16-bounded">16</Link>
            </li>
            <li>
              <Link to="17-responsive-bootstrap-style">17</Link>
            </li>
            <li>
              <Link to="18-scale">18</Link>
            </li>
            <li>
              <Link to="19-allow-overlap">19</Link>
            </li>
            <li>
              <Link to="20-resizable-handles">20</Link>
            </li>
            <li>
              <Link to="21-horizontal">21</Link>
            </li>
            <li>
              <Link to="22-dndkit">22</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div id="detail">
        <Outlet />
      </div>
    </>
  );
}
