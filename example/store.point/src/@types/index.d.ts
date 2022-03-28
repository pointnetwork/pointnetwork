export type Product = {
    productId: string,
    name: string,
    description: string,
    price: string,
    owner: string,
};

export type ProductData = {
    storeId: string,
    productId: string,
    name: string,
    price: string,
    metadata: string,
    owner: string,
};

export type Subscription = (() => Promise<unknown>) & {
    unsubscribe: () => Promise<undefined>
};
