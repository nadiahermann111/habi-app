import './HabiSection.css';
import HabiHappyAdult from './HabiAdultHappy.png';
import FoodControl from '../FoodControl/FoodControl';

const HabiSection = () => {
  return (
    <div className="habi-section">
      <div className="habi-card">
        <h3>Twoja małpka Habi</h3>
        <div className="habi-content">
          <div className="habi-status">
            <div className="habi-avatar">
              <img src={HabiHappyAdult} alt="Habi Happy Adult" />
            </div>
          </div>
          <FoodControl />
        </div>
      </div>
    </div>
  );
};

export default HabiSection;