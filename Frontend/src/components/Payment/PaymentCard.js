import React from "react";
import Cards from "elt-react-credit-cards";
import Typography from "@material-ui/core/Typography";
import {
  formatCreditCardNumber,
  formatCVC,
  formatExpirationDate,
  formatFormData
} from "./utils";
import axios from "axios";
import { toast } from "react-toastify";
import "elt-react-credit-cards/es/styles-compiled.css";
import contractABI from "../../abi.json";
import { createAlchemyWeb3 } from "@alch/alchemy-web3";
import { withRouter } from "react-router-dom";
import Modal from "react-modal";
import Wallet from "../Wallet/Wallet";
import styles from "./styles.css";
import { ContractAddress } from "../../core/constant";

class PaymentCard extends React.Component {
  state = {
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    issuer: "",
    focused: "",
    username: "",
    wallet_address: "",
    phone: "",
    address1: "",
    address2: "",
    state1: "",
    city: "",
    landmark: "",
    pincode: "",
    product: "",
    submitDisabled: true,
    walletdisabled: true,
    formData: null,
    loading: true,
    isModalOpen: false
  };

  componentDidMount() {
    this.setState({ productid: this.props.productid }, () => {
      axios
        .get("http://localhost:5000/api/product", {
          params: { productid: this.state.productid }
        })
        .then((res) => {
          this.setState({ product: res.data.product });
          this.setState({ loading: false });
        })
        .catch((err) => {
          console.log(err);
          this.setState({ loading: false });
          toast.error(`${err.response.data.message}`, {
            position: toast.POSITION.TOP_RIGHT
          });
          setTimeout(() => {
            window.location = "/";
          }, 1000);
        });
    });
  }

  handleCallback = ({ issuer }, isValid) => {
    if (isValid) {
      this.setState({ issuer });
    }
  };

  handleInputFocus = ({ target }) => {
    this.setState({
      focused: target.name
    });
  };

  handleInputChange = ({ target }) => {
    if (target.name === "number") {
      target.value = formatCreditCardNumber(target.value);
    } else if (target.name === "expiry") {
      target.value = formatExpirationDate(target.value);
    } else if (target.name === "cvc") {
      target.value = formatCVC(target.value);
    }

    this.setState({ [target.name]: target.value });
  };

  handleChange = ({ target }) => {
    this.setState({ [target.name]: target.value }, () => {
      if (
        !!this.state.username &&
        !!this.state.phone &&
        !!this.state.address1 &&
        !!this.state.state1 &&
        !!this.state.city &&
        !!this.state.pincode &&
        !!this.props.active &&
        !!this.props.account
      ) {
        this.setState({ submitDisabled: false });
      } else {
        this.setState({ submitDisabled: true });
      }
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    this.setState({ loading: true });
    const mint = async () => {
      const web3 = createAlchemyWeb3(
        "wss://eth-rinkeby.alchemyapi.io/v2/REVztWHAcBv-D3_6p9JkKZo4ima_Hspi"
      );

      const Contract = new web3.eth.Contract(
        JSON.parse(contractABI.result),
        ContractAddress
      );

      const tx = {
        from: process.env.REACT_APP_WALLET_ADDRESS,
        to: ContractAddress,
        gas: 1000000,
        maxPriorityFeePerGas: 1999999987,
        data: Contract.methods
          .mint(
            this.state.product.product_id,
            this.state.product.product_name,
            this.state.product.category,
            this.state.product.warranty_duration,
            50,
            this.props.account,
            this.state.product.product_serial_number
          )
          .encodeABI()
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        process.env.REACT_APP_PRIVATE_KEY
      );

      web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
        if (!error) {
          const interval = setInterval(() => {
            web3.eth.getTransactionReceipt(hash).then((receipt) => {
              if (receipt.status) {
                let token = localStorage.getItem("token");

                axios
                  .post("http://localhost:5000/api/order", {
                    headers: {
                      Authorization: "Bearer " + token
                    },
                    data: {
                      address: this.state.address1,
                      state: this.state.state1,
                      city: this.state.city,
                      pincode: this.state.pincode,
                      wallet_address: this.props.account,
                      product_id: this.state.productid
                    }
                  })
                  .then((res) => {
                    toast.success(`Transaction Successful🎉.`, {
                      position: toast.POSITION.TOP_RIGHT
                    });
                    this.setState({ loading: false });
                    clearInterval(interval);
                    setTimeout(() => {
                      this.props.history.push("/");
                    }, 1000);
                  })
                  .catch((err) => {
                    this.setState({ loading: false });
                    toast.error(`${err.response.data.message}`, {
                      position: toast.POSITION.TOP_RIGHT
                    });
                    clearInterval(interval);
                    setTimeout(() => {
                      this.props.history.push("/");
                    }, 1000);
                  });
              } else {
                toast.error(
                  `❗Something went wrong while submitting your transaction`,
                  {
                    position: toast.POSITION.TOP_RIGHT
                  }
                );
                this.setState({ loading: false });
              }
            });
          }, 4000);
        } else {
          toast.error(
            `❗Something went wrong while submitting your transaction`,
            {
              position: toast.POSITION.TOP_RIGHT
            }
          );
          this.setState({ loading: false });
        }
      });
    };

    mint();
  };

  openModal = () => {
    this.setState({ isModalOpen: true });
  };

  closeModal = () => {
    this.setState({ isModalOpen: false });
  };

  render() {
    const { name, number, expiry, cvc, focused, issuer } = this.state;

    const customStyles = {
      content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-40%",
        transform: "translate(-50%, -50%)"
      },
      overlay: {
        zIndex: 10
      }
    };

    return (
      <div
        key="Payment"
        style={{ paddingTop: "200px", paddingBottom: "200px" }}
        className="container"
      >
        {this.state.loading ? (
          <div style={{ height: "80vh" }}>
            <center>
              <div className="fa-3x mt-5 pt-5">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            </center>
          </div>
        ) : (
          <>
            <div className="row justify-content-center">
              <div className="col-xs-12 col-md-6 col-lg-5 card-1 ">
                <Typography
                  variant="h4"
                  gutterBottom
                  style={{
                    textAlign: "center",
                    color: "#7971ea"
                  }}
                >
                  Enter Your Address Details
                </Typography>

                <Typography
                  variant="h5"
                  style={{
                    color: "#ff5499",
                    fontSize: "15px",
                    textAlign: "center"
                  }}
                >
                  Fill all the required(*) fields to Pay
                </Typography>

                <form className="form-1 " style={{ marginTop: "20px" }}>
                  <div className="row">
                    <div className="col-12">
                      <div className="form-group">
                        <input
                          type="text"
                          name="username"
                          className="form-control"
                          placeholder="Name*"
                          required
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <div className="form-group">
                        <input
                          type="tel"
                          name="phone"
                          className="form-control"
                          placeholder="Phone Number*"
                          required
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <div className="form-group">
                        <input
                          type="text"
                          name="address1"
                          className="form-control"
                          placeholder="Address Line-1*"
                          required
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <div className="form-group">
                        <input
                          type="text"
                          name="address2"
                          className="form-control"
                          placeholder="Address Line-2"
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-6">
                      <div className="form-group">
                        <input
                          type="text"
                          name="state1"
                          className="form-control"
                          placeholder="State*"
                          required
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="form-group">
                        <input
                          type="text"
                          name="city"
                          className="form-control"
                          placeholder="City*"
                          required
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-6">
                      <div className="form-group">
                        <input
                          type="text"
                          name="landmark"
                          className="form-control"
                          placeholder="Landmark"
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="form-group">
                        <input
                          type="tel"
                          name="pincode"
                          className="form-control"
                          placeholder="Pincode*"
                          required
                          onChange={this.handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </form>

                <div className="row">
                  <div className="col-7">
                    <div className="form-group">
                      <input
                        type="text"
                        name="wallet_address"
                        className="form-control"
                        placeholder="Wallet Address*"
                        required
                        onChange={this.handleChange}
                        disabled={this.state.walletdisabled}
                        value={this.props.active ? this.props.account : ""}
                      />
                    </div>
                  </div>
                  <div className="col-5">
                    <button
                      className="btn btn-primary btn-block"
                      style={{ fontSize: "15px" }}
                      onClick={this.openModal}
                      disabled={this.props.active ? true : false}
                    >
                      {this.props.active ? "Connected" : "Connect Wallet"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-1"></div>

              <div className="col-xs-12 col-md-6 col-lg-5 card-1 ">
                <div className="App-payment">
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ textAlign: "center", color: "#7971ea" }}
                  >
                    Enter Your Card Details
                  </Typography>
                  <br />
                  <Cards
                    number={number}
                    name={name}
                    expiry={expiry}
                    cvc={cvc}
                    focused={focused}
                    callback={this.handleCallback}
                  />
                  <form
                    ref={(c) => (this.form = c)}
                    className="form-2"
                    onSubmit={this.handleSubmit}
                  >
                    <div className="row">
                      <div className="col-12">
                        <div className="form-group">
                          <input
                            type="tel"
                            name="number"
                            className="form-control"
                            placeholder="Card Number"
                            pattern="[\d| ]{16,22}"
                            required
                            onChange={this.handleInputChange}
                            onFocus={this.handleInputFocus}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-12">
                        <div className="form-group">
                          <input
                            type="text"
                            name="name"
                            className="form-control"
                            placeholder="Name"
                            required
                            onChange={this.handleInputChange}
                            onFocus={this.handleInputFocus}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-6">
                        <input
                          type="tel"
                          name="expiry"
                          className="form-control"
                          placeholder="Valid Thru"
                          pattern="\d\d/\d\d"
                          required
                          onChange={this.handleInputChange}
                          onFocus={this.handleInputFocus}
                        />
                      </div>
                      <div className="col-6">
                        <input
                          type="tel"
                          name="cvc"
                          className="form-control"
                          placeholder="CVV"
                          pattern="\d{3,4}"
                          required
                          onChange={this.handleInputChange}
                          onFocus={this.handleInputFocus}
                        />
                      </div>
                    </div>
                    <input type="hidden" name="issuer" value={issuer} />
                    <br />
                    <div className="form-actions">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <button
                          className="btn btn-primary btn-block"
                          disabled={this.state.submitDisabled}
                          style={{ width: "250px" }}
                        >
                          PAY ₹ {this.state.product.product_price}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        <Modal
          isOpen={this.state.isModalOpen}
          onRequestClose={this.closeModal}
          style={customStyles}
        >
          <Wallet />
        </Modal>
      </div>
    );
  }
}

export default withRouter(PaymentCard);