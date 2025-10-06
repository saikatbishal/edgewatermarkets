import React from "react";
import "./MatchView.css";

interface Trade {
  id: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestamp: string;
}

interface MatchViewProps {
  trades: Trade[];
}

const MatchView: React.FC<MatchViewProps> = ({ trades }) => {
  return (
    <div className="match-view">
      <table className="trades-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Side</th>
            <th>Price</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className={`trade-row ${trade.side}`}>
              <td>{new Date(trade.timestamp).toLocaleTimeString()}</td>
              <td>{trade.side.toUpperCase()}</td>
              <td>{trade.price}</td>
              <td>{trade.size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchView;
