// src/context/ReceiptsContext.js
import React, { createContext, useContext, useState } from 'react';

const ReceiptsContext = createContext();

export function ReceiptsProvider({ children }) {
  const [receiptsData, setReceiptsData] = useState({
    entries: [],
    eglise: '',
    district: '',
    federation: '',
    sabbathDate: '',
    monthId: '',
    sabbathIndex: ''
  });

  const updateReceipts = (data) => {
    setReceiptsData(data);
  };

  return (
    <ReceiptsContext.Provider value={{ receiptsData, updateReceipts }}>
      {children}
    </ReceiptsContext.Provider>
  );
}

export function useReceipts() {
  return useContext(ReceiptsContext);
}