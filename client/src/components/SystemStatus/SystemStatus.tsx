import React from "react";
import "./SystemStatus.css";

interface Channel {
  id: string;
  name: string;
  status: "connected" | "disconnected";
  lastUpdate: string;
}

interface SystemStatusProps {
  channels: Channel[];
}

const SystemStatus: React.FC<SystemStatusProps> = ({ channels }) => {
  return (
    <div className="system-status">
      <h3>System Status</h3>
      <div className="channels-list">
        {channels.map((channel) => (
          <div key={channel.id} className={`channel-item ${channel.status}`}>
            <span className="channel-name">{channel.name}</span>
            <span className="channel-status">{channel.status}</span>
            <span className="channel-time">
              {new Date(channel.lastUpdate).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemStatus;
