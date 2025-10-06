import { useContext } from "react";
import { SocketContext } from "./SocketContext.types";

export const useSocket = () => useContext(SocketContext);
