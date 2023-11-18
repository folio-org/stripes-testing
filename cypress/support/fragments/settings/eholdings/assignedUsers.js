import Credentials from './credentials';

export default {
  assignUserViaApi({ userId, credentialsId }) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: `eholdings/kb-credentials/${credentialsId}/users`,
        contentTypeHeader: 'application/vnd.api+json',
        body: {
          data: {
            id: userId,
            credentialsId,
          },
        },
      })
      .then(({ body }) => {
        return body;
      });
  },
  assignUserToDefaultCredentialsViaApi({ userId }) {
    Credentials.getCredentialsViaApi().then((credentials) => {
      this.assignUserViaApi({ userId, credentialsId: credentials[0].id });
    });
  },
};
