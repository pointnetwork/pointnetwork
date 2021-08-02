import React, { ReactNode } from 'react';

export default ({ children }: { children: ReactNode }) => (
    <div className="success-label inline">
        { children }
    </div>
);
