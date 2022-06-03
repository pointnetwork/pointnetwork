import React, { useState } from "react";
import QRCode from "qrcode.react";

const ReceiveModal = ({ currency, address, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
        });
    };

    return (
        <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
        >
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="exampleModalLabel">
                            Receive {currency}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>
                    <div className="modal-body">
                        <div
                            style={{
                                justifyContent: "center",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <QRCode
                                renderAs="svg"
                                value={address}
                                size={220}
                                level="H"
                            />
                            <div
                                className="input-group"
                                style={{ marginTop: "20px" }}
                            >
                                <input
                                    readOnly
                                    type="text"
                                    className="form-control mono address"
                                    value={address}
                                    style={{ textAlign: "center" }}
                                />
                                <span className="input-group-btn">
                                    <button
                                        className="btn btn-secondary btn-lg"
                                        type="button"
                                        title="Copy to Clipboard"
                                        onClick={handleCopy}
                                        style={{
                                            width: "80px",
                                            height: "38px",
                                            marginLeft: "20px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {copied && (
                                            <span
                                                className="checkmark"
                                                style={{
                                                    color: "#69e069",
                                                    width: "14px",
                                                    textAlign: "center",
                                                    marginRight: "5px",
                                                }}
                                            >
                                                &#10003;
                                            </span>
                                        )}
                                        <svg
                                            width="16"
                                            height="16"
                                            fill="currentColor"
                                            className="bi bi-clipboard"
                                            viewBox="0 0 16 16"
                                            style={{ width: "14px" }}
                                        >
                                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                                        </svg>
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiveModal;
