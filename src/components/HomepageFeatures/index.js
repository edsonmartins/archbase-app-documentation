import React from 'react';
import clsx from 'clsx';
import {useColorMode} from '@docusaurus/theme-common';
import styles from './styles.module.css';


const FeatureList = [
  {
    title: 'Desenvolvimento Backend',
    img: require('@site/static/img/backend_banner.png').default,
    url: '/docs/intro',
    description: (
      <>
        Nossa estrutura de desenvolvimento backend é um dos pilares do Archbase Application Framework. 
        Oferecemos um ambiente flexível que permite que desenvolvedores atinjam desde simples aplicações 
        até implementações avançadas do Domain-Driven Design (DDD). O Archbase fornece uma série de 
        ferramentas e frameworks que simplificam o desenvolvimento de aplicativos no lado do servidor, 
        permitindo que você adote práticas de DDD para criar arquiteturas escaláveis e bem organizadas. 
        Desde a criação de APIs robustas até a integração com bancos de dados de alto desempenho, 
        o Archbase dá suporte às melhores práticas de desenvolvimento, capacitando você a criar 
        aplicativos sólidos e eficientes.
      </>
    ),
  },
  {
    title: 'Desenvolvimento Frontend',
    img: require('@site/static/img/frontend_banner.png').default,
    url: 'https://react.archbase.com.br',
    description: (
      <>
        O desenvolvimento FrontEnd é a essência do Archbase Application Framework. Nossa biblioteca de 
        componentes React com TypeScript fornece uma coleção rica de elementos visuais que simplificam 
        a criação de interfaces web atraentes e funcionais. Desde componentes básicos a layouts complexos, 
        o Archbase React oferece uma base sólida para o desenvolvimento FrontEnd, economizando tempo e 
        esforço. Com a facilidade de uso e a capacidade de personalização, você pode criar interfaces 
        de usuário impressionantes para seus aplicativos, mantendo a produtividade e a consistência 
        em todo o processo.
      </>
    ),
  },
  {
    title: 'Desenvolvimento mobile',
    img: require('@site/static/img/mobile_banner.png').default,
    url: 'https://flutter.archbase.com.br',
    description: (
      <>
        O desenvolvimento mobile com o Archbase Application Framework é direcionado principalmente para 
        o Flutter, uma das tecnologias mais versáteis e populares para o desenvolvimento de aplicativos 
        móveis. Com suporte total ao Flutter, você pode criar aplicativos nativos para Android e iOS de 
        forma eficiente. Ao compartilhar uma base de código entre aplicativos web e móveis, você economiza 
        tempo e recursos, mantendo uma experiência de usuário consistente em todas as plataformas. 
        O Archbase oferece um ambiente integrado para o desenvolvimento mobile que permite a criação 
        rápida de interfaces de usuário impressionantes e funcionalidades móveis avançadas.
      </>
    ),
  },
];

function Feature({ img, title, description, url }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center" style={{backgroundColor: 'aliceblue', borderRadius: '32px'}}>
        <a href={url}>
          <img className={styles.featureImage} src={img} />
        </a>
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
