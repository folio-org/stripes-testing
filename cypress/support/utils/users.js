// eslint-disable-next-line import/prefer-default-export
export const getFullName = (user) => {
  let fullName = user?.personal?.lastName ?? '';
  let givenName = user?.personal?.preferredFirstName ?? user?.personal?.firstName ?? '';
  const middleName = user?.personal?.middleName ?? '';
  if (middleName) {
    givenName += `${givenName ? ' ' : ''}${middleName}`;
  }

  if (givenName) {
    fullName += `${fullName ? ', ' : ''}${givenName}`;
  }

  return fullName;
};

/**
 * Parses sanity check parameters from Cypress environment variables.
 *
 * Retrieves the 'sanityCheck' environment variable, parses it as JSON, and extracts
 * user credentials and tenant information for testing purposes.
 *
 * @returns {{user: {username: string, password: string}, centralTenant: {id: string, name: string}, memberTenant: {id: string, name: string}}}
 * An object containing:
 * - user: Object with username and password properties
 * - centralTenant: Object with id and name properties
 * - memberTenant: Object with id and name properties
 *
 * @throws {Error} If sanityCheck parameters are not set in Cypress environment variables
 * @throws {Error} If sanityCheck parameters are not valid JSON in the expected format
 *
 * @example
 * // Expected JSON format in Cypress.env('sanityCheck'):
 * // {"username": "testuser", "password": "testpass", "centralTenant": {"id": "1", "name": "Central"}, "memberTenant": {"id": "2", "name": "Member"}}
 * const { user, centralTenant, memberTenant } = parseSanityParameters();
 */
export const parseSanityParameters = () => {
  const sanityParams = Cypress.env('sanityCheck');
  let parsedParams = null;
  if (!sanityParams) {
    throw new Error('Sanity check parameters are not set in Cypress environment variables');
  }
  try {
    parsedParams = JSON.parse(sanityParams);
  } catch (e) {
    throw new Error(
      'Sanity check parameters are not valid JSON\n Use format:\n {"username": "", "password": "", "centralTenant": {"id": "", "name": ""}, "memberTenant": {"id": "", "name": ""}}',
    );
  }
  return {
    user: { username: parsedParams.username, password: parsedParams.password },
    centralTenant: parsedParams.centralTenant,
    memberTenant: parsedParams.memberTenant,
  };
};
