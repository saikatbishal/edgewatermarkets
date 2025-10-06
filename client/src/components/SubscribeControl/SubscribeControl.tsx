import React from "react";
import "./SubscribeControl.css";

interface SubscribeControlProps {
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  isSubscribed: boolean;
}

const SubscribeControl: React.FC<SubscribeControlProps> = ({
  onSubscribe,
  onUnsubscribe,
  isSubscribed,
}) => {
  return (
    <div className="subscribe-control">
      <button
        onClick={isSubscribed ? onUnsubscribe : onSubscribe}
        className={`subscribe-button ${isSubscribed ? "subscribed" : ""}`}
      >
        {isSubscribed ? "Unsubscribe" : "Subscribe"}
      </button>
    </div>
  );
};

export default SubscribeControl;
