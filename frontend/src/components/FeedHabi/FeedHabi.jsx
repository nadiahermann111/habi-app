import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const foodControlRef = useRef(null);

  const foodItems = [
    { id: 1, name: "Banan", smallCost: 1, mediumCost: 5, largeCost: 10, icon: "🍌", nutrition: { small: 5, medium: 15, large: 25 } },
    { id: 2, name: "Jabłko", smallCost: 1, mediumCost: 5, largeCost: 10, icon: "🍎", nutrition: { small: 5, medium: 15, large: 25 } },
    { id: 3, name: "Orzech", smallCost: 5, mediumCost: 10, largeCost: 20, icon: "🥜", nutrition: { small: 10, medium: 20, large: 35 } },
    { id: 4, name: "Kawa", smallCost: 10, mediumCost: 20, largeCost: 30, icon: "☕", nutrition: { small: 15, medium: 25, large: 40 } },
    { id: 5, name: "Mięso", smallCost: 10, mediumCost: 20, largeCost: 25, icon: "🥩", nutrition: { small: 15, medium: 25, large: 35 } },
    { id: 6, name: "Sałatka", smallCost: 20, mediumCost: 50, largeCost: 50, icon: "🥗", nutrition: { small: 25, medium: 45, large: 50 } }
  ];

  const handlePurchase = (item, size) => {
    const cost = item[`${size}Cost`];
    const nutrition = item.nutrition[size];

    if (currentCoins >= cost) {
      const newAmount = currentCoins - cost;
      setCurrentCoins(newAmount);
      onCoinsUpdate(newAmount);

      // Nakarm Habi
      if (foodControlRef.current) {
        foodControlRef.current.feedHabi(nutrition);
      }

      // Pokaż animację
      setPurchaseAnimation({ itemName: item.name, nutrition });
      setTimeout(() => setPurchaseAnimation(null), 2000);

    } else {
      alert(`Potrzebujesz ${cost} monet!`);
    }
  };

  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: 'linear-gradient(135deg, #faf5cc 0%, #fff9c3 100%)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        padding: '12px 16px',
        borderRadius: '16px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={onBack} style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            marginRight: '12px',
            cursor: 'pointer'
          }}>
            ←
          </button>
          <h2 style={{ margin: 0, color: '#6c5b2f' }}>Nakarm Habi</h2>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f4d03f 0%, #f7dc6f 100%)',
          padding: '8px 12px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>🪙</span>
          <span style={{ fontWeight: '600', color: '#6c5b2f' }}>{currentCoins}</span>
        </div>
      </div>

      {/* Purchase Animation */}
      {purchaseAnimation && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '20px',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#6c5b2f', marginBottom: '8px' }}>
              {purchaseAnimation.itemName} kupione!
            </div>
            <div style={{ fontSize: '14px', color: '#28a745' }}>
              +{purchaseAnimation.nutrition} odżywiania dla Habi
            </div>
          </div>
        </div>
      )}

      {/* Food Items */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {foodItems.map(item => (
          <div key={item.id} style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>{item.icon}</span>
              <h3 style={{ margin: 0, color: '#6c5b2f' }}>{item.name}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['small', 'medium', 'large'].map(size => {
                const cost = item[`${size}Cost`];
                const nutrition = item.nutrition[size];
                const canAfford = currentCoins >= cost;
                const sizeLabel = size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L';
                const sizeColor = size === 'small' ? '#28a745' : size === 'medium' ? '#ffc107' : '#dc3545';

                return (
                  <button
                    key={size}
                    onClick={() => handlePurchase(item, size)}
                    disabled={!canAfford}
                    style={{
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '12px',
                      background: canAfford ? '#f8f9fa' : '#e9ecef',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      opacity: canAfford ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{
                      background: sizeColor,
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {sizeLabel}
                    </span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', color: '#6c5b2f' }}>🪙 {cost}</div>
                      <div style={{ fontSize: '12px', color: '#28a745' }}>+{nutrition}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Food Control */}
      <FoodControl ref={foodControlRef} />
    </div>
  );
};

export default FeedHabi;