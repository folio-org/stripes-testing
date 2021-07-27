import React from 'react';

jest.mock('@folio/stripes/core', () => {
  const STRIPES = {
    connect: (Component) => Component,
    config: {},
    currency: 'USD',
    hasInterface: () => true,
    hasPerm: jest.fn().mockReturnValue(true),
    locale: 'en-US',
    logger: {
      log: () => {},
    },
    okapi: {
      tenant: 'diku',
      url: 'https://folio-testing-okapi.dev.folio.org',
    },
    store: {
      getState: () => ({
        okapi: {
          token: 'abc',
        },
      }),
      dispatch: () => {},
      subscribe: () => {},
      replaceReducer: () => {},
    },
    timezone: 'UTC',
    user: {
      perms: {},
      user: {
        id: 'b1add99d-530b-5912-94f3-4091b4d87e2c',
        username: 'diku_admin',
      },
    },
    withOkapi: true,
  };
  return {
    AppIcon: jest.fn(({ ariaLabel }) => <span>{ariaLabel}</span>),
    TitleManager: jest.fn(({ children, ...rest }) => (
      <span {...rest}>{children}</span>
    )),
    IfInterface: jest.fn(({ name, children }) => {
      return name === 'interface' ? children : null;
    }),
    IfPermission: jest.fn(({ perm, children }) => {
      if (perm === 'permission') {
        return children;
      } else if (perm.startsWith('ui-users')) {
        return children;
      } else {
        return null;
      }
    }),
    Pluggable: jest.fn(({ children }) => [children]),
    stripesConnect: (Component) => (props) => <Component {...props} />,
    useStripes: () => STRIPES,
    withStripes:
      // eslint-disable-next-line react/prop-types
      (Component) => ({ stripes, ...rest }) => {
        const fakeStripes = stripes || STRIPES;
        return <Component {...rest} stripes={fakeStripes} />;
      },
  };
});
