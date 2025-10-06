import React from "react";
import "./PriceView.css";

interface PriceData {
  bid: number;
  ask: number;
  timestamp: string;
}

interface PriceViewProps {
  data: PriceData;
}

const PriceView: React.FC<PriceViewProps> = ({ data }) => {
  return (
    <div className="price-view">
      <div className="price-card">
        <div className="price-item">
          <span className="label">Bid:</span>
          <span className="value bid">{data.bid}</span>
        </div>
        <div className="price-item">
          <span className="label">Ask:</span>
          <span className="value ask">{data.ask}</span>
        </div>
        <div className="timestamp">
          {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default PriceView;
