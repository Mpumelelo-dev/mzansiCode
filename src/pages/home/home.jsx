import React from 'react';
import "./home.scss";
import NavBar from "../../components/NavBar/NavBar";
import MapComponent from "../../components/MapComponent/MapComponent";

const Home = () => {
  return (
    <div className='home'>
      <div className="home__nav">
        <NavBar />
      </div>
      <div className="home__content">
        <MapComponent />
      </div>
    </div>
  );
}

export default Home;
