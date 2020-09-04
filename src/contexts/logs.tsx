import React, { useState } from 'react';
import { Appearance } from 'react-native';
import { LogItem, TimedLog, valueof } from '../types';


interface ILogsContext {
    logs: TimedLog,
    append: (logItem: LogItem) => void
}



const initialState: TimedLog = [];

export const LogsContext = React.createContext<ILogsContext>({
    logs: initialState,
    append: () => { }
});
const { Provider } = LogsContext;
const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<TimedLog>(initialState);
    return (
        <Provider value={{
            logs,
            append: (logItem: LogItem) => {
                setLogs(current => ([...current, { logItem, timestamp: new Date(Date.now()).toLocaleString() }]));
            }
        }}>
            {children}
        </Provider>
    )
};

export default LogsProvider;