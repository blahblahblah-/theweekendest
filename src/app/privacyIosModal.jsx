import React from 'react';
import { Modal } from 'semantic-ui-react';
import { withRouter } from 'react-router-dom';
import { Helmet } from "react-helmet";

class PrivacyIosModal extends React.Component {
  handleOnClose = () => {
    const { history } = this.props;
    return history.push('/');
  };

  render() {
    return(
      <Modal basic
        open={this.props.open} onClose={this.handleOnClose}
        closeIcon dimmer="blurring" closeOnDocumentClick closeOnDimmerClick>
        <Helmet>
          <title>Subway Now (formerly The Weekendest) - App Privacy Policy</title>
          <meta property="og:title" content="Subway Now (formerly The Weekendest) - App Privacy Policy" />
          <meta name="twitter:title" content="Subway Now (formerly The Weekendest) - App Privacy Policy" />
          <meta property="og:url" content={`https://www.subwaynow.app/privacy-ios`} />
          <meta name="twitter:url" content={`https://www.subwaynow.app/privacy-ios`} />
          <link rel="canonical" href={`https://www.subwaynow.app/privacy-ios`} />
        </Helmet>
        <Modal.Header>
          App Privacy Policy
        </Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <h4>TL;DR</h4>
            <p>
              Subway Now does not want to know who you are and does not store any of your personal information. However, we use Mapbox, and they may. Please refer to <a href="https://www.mapbox.com/legal/privacy" target="_blank">their privacy policy</a> to see how they may use your data.
            </p>
            <p>
              This Privacy Policy document contains types of information that is collected and recorded by Subway Now and how we use it.
            </p>
            <p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to <a href="mailto:privacy@subwaynow.app">contact us</a>.</p>
            <h4>Log Files</h4>
            <p>
              Subway Now follows a standard procedure of using log files. These files log visitors when they use our App. The information collected by log files include internet protocol (IP) addresses, Internet Service Provider (ISP), date and time stamp, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the app, tracking users' movement on the app, and gathering demographic information.
            </p>
            <h4>Privacy Policies</h4>
            <p>You may consult this list to find the Privacy Policy for each of the advertising partners of Subway Now.</p>
            <h4>Third Party Privacy Policies</h4>
            <p>Subway Now's Privacy Policy does not apply to other parties or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.</p>
            <p>Our app uses Mapbox's API for its map. Please refer to <a href="https://www.mapbox.com/legal/privacy" target="_blank">their privacy policy</a> to see how they may use your data.</p>
            <h4>Children's Information</h4>
            <p>Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.</p>
            <p>Subway Now does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our App, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.</p>
            <h4>Online Privacy Policy Only</h4>
            <p>This Privacy Policy applies only to our online activities and is valid for visitors to our App with regards to the information that they shared and/or collect in Subway Now. This policy is not applicable to any information collected offline or via channels other than this app. Our Privacy Policy was created with the help of the <a href="https://www.app-privacy-policy.com/app-privacy-policy-generator/">App Privacy Policy Generator from App-Privacy-Policy.com</a></p>
            <h4>Consent</h4>
            <p>By using our app, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.</p>
          </Modal.Description>
        </Modal.Content>
      </Modal>
    )
  }
}
export default withRouter(PrivacyIosModal);