import React, { useEffect } from 'react';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Home() {
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    history.replace(siteConfig.baseUrl + 'docs/getting-started/installation');
  }, [history, siteConfig.baseUrl]);

  return null;
}
