import axios from 'axios';
import {BigNumber} from 'ethers';
import {keccak256, Interface} from 'ethers/lib/utils';
import {CacheFactory} from '../util';
import type {AbiItem, AbiItemInput, Log, EventLog, NotificationSubscription} from './types';

// TODO: remove mock function and get ABIs from Arweave
async function loadABI(contractName: string): Promise<AbiItem[] | undefined> {
    switch (contractName) {
        case 'social':
            return [
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: false,
                            internalType: 'address',
                            name: 'previousAdmin',
                            type: 'address'
                        },
                        {
                            indexed: false,
                            internalType: 'address',
                            name: 'newAdmin',
                            type: 'address'
                        }
                    ],
                    name: 'AdminChanged',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'beacon',
                            type: 'address'
                        }
                    ],
                    name: 'BeaconUpgraded',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'previousOwner',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'newOwner',
                            type: 'address'
                        }
                    ],
                    name: 'OwnershipTransferred',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'uint256',
                            name: 'date',
                            type: 'uint256'
                        }
                    ],
                    name: 'ProfileChange',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: false,
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'date',
                            type: 'uint256'
                        },
                        {
                            indexed: true,
                            internalType: 'enum PointSocial.Component',
                            name: 'component',
                            type: 'uint8'
                        },
                        {
                            indexed: true,
                            internalType: 'enum PointSocial.Action',
                            name: 'action',
                            type: 'uint8'
                        }
                    ],
                    name: 'StateChange',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'implementation',
                            type: 'address'
                        }
                    ],
                    name: 'Upgraded',
                    type: 'event'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'author',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'image',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'uint16',
                            name: 'likesCount',
                            type: 'uint16'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    name: 'add',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'author',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    name: 'addComment',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        }
                    ],
                    name: 'addCommentToPost',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: '_from',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: '_createdAt',
                            type: 'uint256'
                        }
                    ],
                    name: 'addLike',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        }
                    ],
                    name: 'addLikeToPost',
                    outputs: [
                        {
                            internalType: 'bool',
                            name: '',
                            type: 'bool'
                        }
                    ],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'migrator',
                            type: 'address'
                        }
                    ],
                    name: 'addMigrator',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'image',
                            type: 'bytes32'
                        }
                    ],
                    name: 'addPost',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'user',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'name',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'location',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'about',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'avatar',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'banner',
                            type: 'bytes32'
                        }
                    ],
                    name: 'addProfile',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        }
                    ],
                    name: 'checkLikeToPost',
                    outputs: [
                        {
                            internalType: 'bool',
                            name: '',
                            type: 'bool'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'commentById',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'commentIdsByOwner',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'commentIdsByPost',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'commentId',
                            type: 'uint256'
                        }
                    ],
                    name: 'deleteCommentForPost',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        }
                    ],
                    name: 'deletePost',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'commentId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        }
                    ],
                    name: 'editCommentForPost',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'image',
                            type: 'bytes32'
                        }
                    ],
                    name: 'editPost',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'postId',
                            type: 'uint256'
                        }
                    ],
                    name: 'getAllCommentsForPost',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                }
                            ],
                            internalType: 'struct PointSocial.Comment[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'getAllPosts',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'image',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'likesCount',
                                    type: 'uint16'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'commentsCount',
                                    type: 'uint16'
                                }
                            ],
                            internalType: 'struct PointSocial.Post[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'owner',
                            type: 'address'
                        }
                    ],
                    name: 'getAllPostsByOwner',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'image',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'likesCount',
                                    type: 'uint16'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'commentsCount',
                                    type: 'uint16'
                                }
                            ],
                            internalType: 'struct PointSocial.Post[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'owner',
                            type: 'address'
                        }
                    ],
                    name: 'getAllPostsByOwnerLength',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'getAllPostsLength',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        }
                    ],
                    name: 'getCommentById',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                }
                            ],
                            internalType: 'struct PointSocial.Comment',
                            name: '',
                            type: 'tuple'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'getLikes',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                }
                            ],
                            internalType: 'struct PointSocial.Like[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_postId',
                            type: 'uint256'
                        }
                    ],
                    name: 'getLikesByPost',
                    outputs: [
                        {
                            internalType: 'uint256[]',
                            name: '',
                            type: 'uint256[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'cursor',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'howMany',
                            type: 'uint256'
                        }
                    ],
                    name: 'getPaginatedPosts',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'image',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'likesCount',
                                    type: 'uint16'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'commentsCount',
                                    type: 'uint16'
                                }
                            ],
                            internalType: 'struct PointSocial.Post[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'owner',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: 'cursor',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'howMany',
                            type: 'uint256'
                        }
                    ],
                    name: 'getPaginatedPostsByOwner',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'image',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'likesCount',
                                    type: 'uint16'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'commentsCount',
                                    type: 'uint16'
                                }
                            ],
                            internalType: 'struct PointSocial.Post[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        }
                    ],
                    name: 'getPostById',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'contents',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'image',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'likesCount',
                                    type: 'uint16'
                                },
                                {
                                    internalType: 'uint16',
                                    name: 'commentsCount',
                                    type: 'uint16'
                                }
                            ],
                            internalType: 'struct PointSocial.Post',
                            name: '',
                            type: 'tuple'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'id_',
                            type: 'address'
                        }
                    ],
                    name: 'getProfile',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'bytes32',
                                    name: 'displayName',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'displayLocation',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'displayAbout',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'avatar',
                                    type: 'bytes32'
                                },
                                {
                                    internalType: 'bytes32',
                                    name: 'banner',
                                    type: 'bytes32'
                                }
                            ],
                            internalType: 'struct PointSocial.Profile',
                            name: '',
                            type: 'tuple'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'identityContractAddr',
                            type: 'address'
                        },
                        {
                            internalType: 'string',
                            name: 'identityHandle',
                            type: 'string'
                        }
                    ],
                    name: 'initialize',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'likeById',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'likeIdsByPost',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_postId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: '_id',
                            type: 'uint256'
                        }
                    ],
                    name: 'linkLike',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'owner',
                    outputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'postById',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'contents',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'image',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint16',
                            name: 'likesCount',
                            type: 'uint16'
                        },
                        {
                            internalType: 'uint16',
                            name: 'commentsCount',
                            type: 'uint16'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'postIds',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'postIdsByOwner',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        }
                    ],
                    name: 'profileByOwner',
                    outputs: [
                        {
                            internalType: 'bytes32',
                            name: 'displayName',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'displayLocation',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'displayAbout',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'avatar',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'banner',
                            type: 'bytes32'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'proxiableUUID',
                    outputs: [
                        {
                            internalType: 'bytes32',
                            name: '',
                            type: 'bytes32'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'renounceOwnership',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'bytes32',
                            name: 'name_',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'location_',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'about_',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'avatar_',
                            type: 'bytes32'
                        },
                        {
                            internalType: 'bytes32',
                            name: 'banner_',
                            type: 'bytes32'
                        }
                    ],
                    name: 'setProfile',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'newOwner',
                            type: 'address'
                        }
                    ],
                    name: 'transferOwnership',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'newImplementation',
                            type: 'address'
                        }
                    ],
                    name: 'upgradeTo',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'newImplementation',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes',
                            name: 'data',
                            type: 'bytes'
                        }
                    ],
                    name: 'upgradeToAndCall',
                    outputs: [],
                    stateMutability: 'payable',
                    type: 'function'
                }
            ] as AbiItem[];
        case 'email':
            return [
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: false,
                            internalType: 'address',
                            name: 'previousAdmin',
                            type: 'address'
                        },
                        {
                            indexed: false,
                            internalType: 'address',
                            name: 'newAdmin',
                            type: 'address'
                        }
                    ],
                    name: 'AdminChanged',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'beacon',
                            type: 'address'
                        }
                    ],
                    name: 'BeaconUpgraded',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'timestamp',
                            type: 'uint256'
                        }
                    ],
                    name: 'EmailCreated',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'user',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: false,
                            internalType: 'bool',
                            name: 'deleted',
                            type: 'bool'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'timestamp',
                            type: 'uint256'
                        }
                    ],
                    name: 'EmailDeleted',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'user',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: false,
                            internalType: 'bool',
                            name: 'important',
                            type: 'bool'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'timestamp',
                            type: 'uint256'
                        }
                    ],
                    name: 'EmailMarkedAsImportant',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'timestamp',
                            type: 'uint256'
                        }
                    ],
                    name: 'EmailMigrated',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'user',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: false,
                            internalType: 'bool',
                            name: 'read',
                            type: 'bool'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'timestamp',
                            type: 'uint256'
                        }
                    ],
                    name: 'EmailRead',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'previousOwner',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'newOwner',
                            type: 'address'
                        }
                    ],
                    name: 'OwnershipTransferred',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'recipient',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'bool',
                            name: 'cc',
                            type: 'bool'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'timestamp',
                            type: 'uint256'
                        }
                    ],
                    name: 'RecipientAdded',
                    type: 'event'
                },
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'implementation',
                            type: 'address'
                        }
                    ],
                    name: 'Upgraded',
                    type: 'event'
                },
                {
                    inputs: [],
                    name: 'INITIAL_EMAIL_ID',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: '_from',
                            type: 'address'
                        },
                        {
                            internalType: 'address[]',
                            name: '_to',
                            type: 'address[]'
                        },
                        {
                            internalType: 'address[]',
                            name: '_cc',
                            type: 'address[]'
                        },
                        {
                            internalType: 'uint256',
                            name: '_createdAt',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address[]',
                            name: '_users',
                            type: 'address[]'
                        },
                        {
                            components: [
                                {
                                    internalType: 'string',
                                    name: 'encryptedMessageId',
                                    type: 'string'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedSymmetricObj',
                                    type: 'string'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'important',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'deleted',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'read',
                                    type: 'bool'
                                }
                            ],
                            internalType: 'struct PointEmail.EmailUserMetaData[]',
                            name: '_metadata',
                            type: 'tuple[]'
                        }
                    ],
                    name: 'addEmailFromMigration',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_emailId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bool',
                            name: '_deleted',
                            type: 'bool'
                        }
                    ],
                    name: 'deleteEmail',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'emailIdToEmail',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        }
                    ],
                    name: 'emailUserMetadata',
                    outputs: [
                        {
                            internalType: 'string',
                            name: 'encryptedMessageId',
                            type: 'string'
                        },
                        {
                            internalType: 'string',
                            name: 'encryptedSymmetricObj',
                            type: 'string'
                        },
                        {
                            internalType: 'bool',
                            name: 'important',
                            type: 'bool'
                        },
                        {
                            internalType: 'bool',
                            name: 'deleted',
                            type: 'bool'
                        },
                        {
                            internalType: 'bool',
                            name: 'read',
                            type: 'bool'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'fromEmails',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '_from',
                            type: 'address'
                        }
                    ],
                    name: 'getAllEmailsByFromAddress',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'to',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'cc',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedMessageId',
                                    type: 'string'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedSymmetricObj',
                                    type: 'string'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'important',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'deleted',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'read',
                                    type: 'bool'
                                }
                            ],
                            internalType: 'struct PointEmail.EmailWithUserMetaData[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '_to',
                            type: 'address'
                        }
                    ],
                    name: 'getAllEmailsByToAddress',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'to',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'cc',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedMessageId',
                                    type: 'string'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedSymmetricObj',
                                    type: 'string'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'important',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'deleted',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'read',
                                    type: 'bool'
                                }
                            ],
                            internalType: 'struct PointEmail.EmailWithUserMetaData[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'getDeletedEmails',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'to',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'cc',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedMessageId',
                                    type: 'string'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedSymmetricObj',
                                    type: 'string'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'important',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'deleted',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'read',
                                    type: 'bool'
                                }
                            ],
                            internalType: 'struct PointEmail.EmailWithUserMetaData[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_emailId',
                            type: 'uint256'
                        }
                    ],
                    name: 'getEmailById',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'to',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'cc',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedMessageId',
                                    type: 'string'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedSymmetricObj',
                                    type: 'string'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'important',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'deleted',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'read',
                                    type: 'bool'
                                }
                            ],
                            internalType: 'struct PointEmail.EmailWithUserMetaData',
                            name: '',
                            type: 'tuple'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'getImportantEmails',
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'id',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'address',
                                    name: 'from',
                                    type: 'address'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'to',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'cc',
                                    type: 'address[]'
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'createdAt',
                                    type: 'uint256'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedMessageId',
                                    type: 'string'
                                },
                                {
                                    internalType: 'string',
                                    name: 'encryptedSymmetricObj',
                                    type: 'string'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'important',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'deleted',
                                    type: 'bool'
                                },
                                {
                                    internalType: 'bool',
                                    name: 'read',
                                    type: 'bool'
                                }
                            ],
                            internalType: 'struct PointEmail.EmailWithUserMetaData[]',
                            name: '',
                            type: 'tuple[]'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '_identityContractAddress',
                            type: 'address'
                        },
                        {
                            internalType: 'string',
                            name: '_identityHandle',
                            type: 'string'
                        }
                    ],
                    name: 'initialize',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_emailId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bool',
                            name: '_important',
                            type: 'bool'
                        }
                    ],
                    name: 'markAsImportant',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'uint256',
                            name: '_emailId',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bool',
                            name: '_read',
                            type: 'bool'
                        }
                    ],
                    name: 'markAsRead',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'owner',
                    outputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'proxiableUUID',
                    outputs: [
                        {
                            internalType: 'bytes32',
                            name: '',
                            type: 'bytes32'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [],
                    name: 'renounceOwnership',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'string',
                            name: '_fromEncryptedMessageId',
                            type: 'string'
                        },
                        {
                            internalType: 'string',
                            name: '_fromEncryptedSymmetricObj',
                            type: 'string'
                        },
                        {
                            internalType: 'address[]',
                            name: '_recipients',
                            type: 'address[]'
                        },
                        {
                            internalType: 'string[]',
                            name: '_recipientEncryptedMessageIds',
                            type: 'string[]'
                        },
                        {
                            internalType: 'string[]',
                            name: '_recipientEncryptedSymmetricObjs',
                            type: 'string[]'
                        },
                        {
                            internalType: 'bool[]',
                            name: '_recipientCCs',
                            type: 'bool[]'
                        }
                    ],
                    name: 'send',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: '',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256'
                        }
                    ],
                    name: 'toEmails',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: 'id',
                            type: 'uint256'
                        },
                        {
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: 'createdAt',
                            type: 'uint256'
                        }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'newOwner',
                            type: 'address'
                        }
                    ],
                    name: 'transferOwnership',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'newImplementation',
                            type: 'address'
                        }
                    ],
                    name: 'upgradeTo',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function'
                },
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'newImplementation',
                            type: 'address'
                        },
                        {
                            internalType: 'bytes',
                            name: 'data',
                            type: 'bytes'
                        }
                    ],
                    name: 'upgradeToAndCall',
                    outputs: [],
                    stateMutability: 'payable',
                    type: 'function'
                }
            ] as AbiItem[];
        default:
            return undefined;
    }
}

class NotificationsController {
    private ETH_PROVIDER_URL: string;
    private abis: CacheFactory<string, AbiItem[]>;
    private eventSignatures: CacheFactory<string, {contractName: string, eventName: string}>;
    private filters: CacheFactory<string, string>;

    constructor(expirationSecs: number) {
        this.ETH_PROVIDER_URL = 'https://rpc-mainnet-1.point.space'; // TODO: get from config
        this.abis = new CacheFactory<string, AbiItem[]>(expirationSecs * 1_000);
        this.eventSignatures = new CacheFactory<string, {contractName: string, eventName: string}>(expirationSecs * 1_000);
        this.filters = new CacheFactory<string, string>(expirationSecs * 1_000);
    }

    private toHex(n: number): string {
        return `0x${n.toString(16)}`;
    }

    private fromHex(h: string): number {
        return parseInt(h, 16);
    }

    private async getABI(contractName: string): Promise<AbiItem[] | null> {
        if (!this.abis.has(contractName)) {
            // TODO: get from Arweave
            const abi = await loadABI(contractName);
            if (!abi) {
                throw new Error(`ABI for "${contractName}" not found.`);
            }
            this.abis.add(contractName, abi);
        }
        return this.abis.get(contractName);
    }

    private async getEventDefinition(contractName: string, eventName: string): Promise<AbiItem> {
        const abi = await this.getABI(contractName);
        const def = abi?.find((i: AbiItem) => i.type === 'event' && i.name === eventName);
        if (!def) {
            throw new Error(`Event ${eventName} not found in ABI.`);
        }
        return def;
    }

    private async getEventSignature(contractName: string, eventName: string): Promise<string> {
        const def = await this.getEventDefinition(contractName, eventName);
        const inputTypes = def.inputs.map(i => i.type);
        const signature = `${eventName}(${inputTypes.join(',')})`;
        const hashedSignature = keccak256(Buffer.from(signature));
        this.eventSignatures.add(hashedSignature, {contractName, eventName});
        return hashedSignature;
    }

    private async getFilter(
        from: number,
        to: number,
        addresses: string[],
        topics: Array<string | null | string[]>
    ): Promise<string> {
        const key = addresses.join(':');
        if (this.filters.has(key)) {
            return this.filters.get(key)!;
        }

        // Create filter
        const {data} = await axios.post(this.ETH_PROVIDER_URL, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_newFilter',
            params: [
                {
                    fromBlock: this.toHex(from),
                    toBlock: this.toHex(to),
                    address: addresses,
                    topics
                }
            ]
        });

        if (data.error || !data.result) {
            throw new Error(data.error ? JSON.stringify(data.error) : 'No filter ID returned.');
        }

        const filterId = data.result;
        this.filters.add(key, filterId);
        return filterId;
    }

    private async getPastLogs(
        from: number,
        to: number,
        addresses: string[],
        topics: Array<string | null | string[]>
    ): Promise<Log[]> {
        const filterId = await this.getFilter(from, to, addresses, topics);
        const {data} = await axios.post(this.ETH_PROVIDER_URL, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_getFilterLogs',
            params: [filterId]
        });

        if (data.error) {
            throw new Error(JSON.stringify(data.error));
        }

        const events = data?.result ? data.result : [];
        return events;
    }

    private async loadUserSubscriptions(): Promise<NotificationSubscription[]> {
        // TODO: get from database
        const socialSubscription: NotificationSubscription = {
            contractIdentity: 'social.point',
            contractName: 'social',
            contractAddress: '0xF750B8F0988e4FA1c674C7CF9cEda27EBAc621C8',
            eventName: 'StateChange'
        };
        const emailSubscription: NotificationSubscription = {
            contractIdentity: 'email.point',
            contractName: 'email',
            contractAddress: '0x64E6F6fBd7a9B84de5fD580d23cEDb2CA4b2b63b',
            eventName: 'RecipientAdded',
            filters: ['0x0000000000000000000000000de48ef1442de28b0b060f7ffba3cbbbd8a7fcfb']
        };
        return [socialSubscription, emailSubscription];
    }

    private async parseInputs(
        inputs: AbiItemInput[],
        topics: string[],
        contractName: string,
        data: string
    ): Promise<Record<string, string | number>> {
        const abi = await this.getABI(contractName);
        if (!abi) {
            throw new Error(`ABI for "${contractName}" not found.`);
        }

        const iface = new Interface(abi);
        const parsedLog = iface.parseLog({topics, data});
        const decoded: Record<string, string | number> = {};

        inputs.forEach((input, idx) => {
            let value = parsedLog.args[idx];
            if (value._isBigNumber) {
                value = BigNumber.from(value).toString();
            }
            decoded[input.name] = value;
        });

        return decoded;
    }

    private getTimestamp(data: Record<string, string | number>): number | null {
        if ('timestamp' in data && !Number.isNaN(Number(data.timestamp))) {
            return Number(data.timestamp) * 1_000;
        }
        if ('date' in data && !Number.isNaN(Number(data.date))) {
            return Number(data.date) * 1_000;
        }
        return null;
    }

    private async parseLogs(subs: NotificationSubscription, logs: Log[]): Promise<EventLog[]> {
        const parsedLogs: EventLog[] = [];
        for (const l of logs) {
            if (!l.removed) {
                const {contractName, eventName} = subs;
                const def = await this.getEventDefinition(contractName, eventName);
                const parsedTopicsAndData = await this.parseInputs(
                    def.inputs,
                    l.topics,
                    contractName,
                    l.data
                );
                parsedLogs.push({
                    contractIdentity: subs.contractIdentity,
                    contractName,
                    eventName,
                    blockNumber: this.fromHex(l.blockNumber),
                    data: parsedTopicsAndData,
                    timestamp: this.getTimestamp(parsedTopicsAndData)
                });
            }
        }
        return parsedLogs;
    }

    public async loadUserSubscriptionsAndGetLogs(): Promise<EventLog[]> {
        // TODO: get latest block and make paginated requests.
        const from = 3_886_646;
        const to = 3_888_646;

        const result: EventLog[] = [];
        const subscriptions = await this.loadUserSubscriptions();

        for (const s of subscriptions) {
            const eventSignature = await this.getEventSignature(s.contractName, s.eventName);
            const topics = s.filters ? [eventSignature, ...s.filters] : [eventSignature];
            const logs = await this.getPastLogs(from, to, [s.contractAddress], topics);
            const parsedLogs = await this.parseLogs(s, logs);
            result.push(...parsedLogs);
        }

        // TODO: save logs to database.
        // TODO: make subscription to receive future events.

        return result;
    }
}

const EXPIRATION_SECS = 2 * 60;
export default new NotificationsController(EXPIRATION_SECS);
