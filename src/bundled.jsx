import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const CioAsa = ({ selector, includeCSS = true, ...rest }) => {
  if (document) {
    const stylesheet = document.getElementById('cio-asa-styles');
    const containerElement = document.querySelector(selector);

    if (!containerElement) {
      console.error(`CioAsa: There were no elements found for the provided selector`);

      return;
    }

    if (stylesheet) {
      if (!includeCSS) {
        stylesheet.disabled = true;
      } else {
        stylesheet.disabled = false;
      }
    }

    ReactDOM.createRoot(containerElement).render(
      <React.StrictMode>
        <div {...rest} />
      </React.StrictMode>,
    );
  }
};

if (window) {
  window.CioAsa = CioAsa;
}

export default CioAsa;
