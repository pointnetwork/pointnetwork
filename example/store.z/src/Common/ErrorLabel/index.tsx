import React, { ReactNode } from 'react';

export default ({ children }: { children: ReactNode }) => (
    <div className="un-success-label inline mt--10">
        { children }
    </div>
);
