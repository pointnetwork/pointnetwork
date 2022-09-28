const getDomainSpace = (handle) =>
    handle.endsWith('.sol') ? handle : `${handle}.point`;

export default getDomainSpace;
