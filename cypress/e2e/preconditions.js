import uuid from 'uuid';
import Organizations from '../support/fragments/organizations/organizations';
import { Locations, ServicePoints } from '../support/fragments/settings/tenant';
import Campuses from '../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../support/fragments/settings/tenant/location-setup/libraries';

describe('Preconditions', () => {
  it('Create entities', () => {
    const testData = {
      servicePoints: [],
      institutions: [],
      campuses: [],
      libraries: [],
      locations: [],
    };

    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi({
          id: uuid(),
          name: 'Circ Desk 1',
          code: 'cd1',
          discoveryDisplayName: 'Circulation Desk -- Hallway',
          pickupLocation: true,
          holdShelfExpiryPeriod: {
            duration: 3,
            intervalId: 'Weeks',
          },
        })
          .then(({ body: servicePoint }) => {
            testData.servicePoints.push(servicePoint);
          })
          .then(() => {
            ServicePoints.createViaApi({
              id: uuid(),
              name: 'Circ Desk 2',
              code: 'cd2',
              discoveryDisplayName: 'Circulation Desk -- Back Entrance',
              pickupLocation: true,
              holdShelfExpiryPeriod: {
                duration: 5,
                intervalId: 'Days',
              },
            });
            ServicePoints.createViaApi({
              id: uuid(),
              name: 'Online',
              code: 'Online',
              discoveryDisplayName: 'Online',
            }).then(({ body: servicePoint }) => {
              testData.servicePoints.push(servicePoint);
            });
          });
      })
      .then(() => {
        Institutions.createViaApi({
          id: uuid(),
          name: 'Københavns Universitet',
          code: 'KU',
        }).then((locinst) => {
          testData.institutions.push(locinst);

          Campuses.createViaApi({
            id: uuid(),
            name: 'City Campus',
            code: 'CC',
            institutionId: testData.institutions[0].id,
          }).then((loccamp1) => {
            testData.campuses.push(loccamp1);

            Campuses.createViaApi({
              id: uuid(),
              name: 'Online',
              code: 'E',
              institutionId: testData.institutions[0].id,
            })
              .then((loccamp2) => {
                testData.campuses.push(loccamp2);
              })
              .then(() => {
                Libraries.createViaApi({
                  id: uuid(),
                  name: 'Datalogisk Institut',
                  code: 'DI',
                  campusId: testData.campuses[0].id,
                })
                  .then((loclib1) => {
                    testData.libraries.push(loclib1);
                  })
                  .then(() => {
                    Libraries.createViaApi({
                      id: uuid(),
                      name: 'Online',
                      code: 'E',
                      campusId: testData.campuses[1].id,
                    })
                      .then((loclib2) => {
                        testData.libraries.push(loclib2);
                      })
                      .then(() => {
                        Locations.createViaApi({
                          id: uuid(),
                          code: 'KU/CC/DI/A',
                          name: 'Annex',
                          isActive: true,
                          institutionId: testData.institutions[0].id,
                          campusId: testData.campuses[0].id,
                          libraryId: testData.libraries[0].id,
                          discoveryDisplayName: 'Annex',
                          servicePointIds: [testData.servicePoints[0].id],
                          primaryServicePoint: testData.servicePoints[0].id,
                        }).then((location) => {
                          testData.locations.push(location);
                        });
                        Locations.createViaApi({
                          id: uuid(),
                          code: 'KU/CC/DI/M',
                          name: 'Main Library',
                          isActive: true,
                          institutionId: testData.institutions[0].id,
                          campusId: testData.campuses[0].id,
                          libraryId: testData.libraries[0].id,
                          discoveryDisplayName: 'Main Library',
                          servicePointIds: [testData.servicePoints[0].id],
                          primaryServicePoint: testData.servicePoints[0].id,
                        }).then((location) => {
                          testData.locations.push(location);
                        });
                        Locations.createViaApi({
                          id: uuid(),
                          code: 'KU/CC/DI/O',
                          name: 'ORWIG ETHNO CD',
                          isActive: true,
                          institutionId: testData.institutions[0].id,
                          campusId: testData.campuses[0].id,
                          libraryId: testData.libraries[0].id,
                          discoveryDisplayName: 'ORWIG ETHNO CD',
                          servicePointIds: [testData.servicePoints[0].id],
                          primaryServicePoint: testData.servicePoints[0].id,
                        }).then((location) => {
                          testData.locations.push(location);
                        });
                        Locations.createViaApi({
                          id: uuid(),
                          code: 'KU/CC/DI/P',
                          name: 'Popular Reading Collection',
                          isActive: true,
                          institutionId: testData.institutions[0].id,
                          campusId: testData.campuses[0].id,
                          libraryId: testData.libraries[0].id,
                          discoveryDisplayName: 'Popular Reading Collection',
                          servicePointIds: [testData.servicePoints[0].id],
                          primaryServicePoint: testData.servicePoints[0].id,
                        }).then((location) => {
                          testData.locations.push(location);
                        });
                        Locations.createViaApi({
                          id: uuid(),
                          code: 'KU/CC/DI/2',
                          name: 'SECOND FLOOR',
                          isActive: true,
                          institutionId: testData.institutions[0].id,
                          campusId: testData.campuses[0].id,
                          libraryId: testData.libraries[0].id,
                          discoveryDisplayName: 'SECOND FLOOR',
                          servicePointIds: [testData.servicePoints[0].id],
                          primaryServicePoint: testData.servicePoints[0].id,
                        }).then((location) => {
                          testData.locations.push(location);
                        });

                        Locations.createViaApi({
                          id: uuid(),
                          code: 'E',
                          name: 'Online',
                          isActive: true,
                          institutionId: testData.institutions[0].id,
                          campusId: testData.campuses[1].id,
                          libraryId: testData.libraries[1].id,
                          discoveryDisplayName: 'Online',
                          servicePointIds: [testData.servicePoints[1].id],
                          primaryServicePoint: testData.servicePoints[1].id,
                        }).then((location) => {
                          testData.locations.push(location);
                        });
                      });
                  });
              });
          });
        });
      });
  });

  it.skip('Delete organization via API', () => {
    cy.getAdminToken();
    Organizations.getAllOrganizationsViaApi().then((organizations) => {
      const items = organizations.filter((item) => item.name.includes('autotest_name'));
      items.forEach((item) => {
        Organizations.deleteOrganizationViaApi(item.id);
      });
    });
  });

  it.skip('Delete locations via API', () => {
    cy.getAdminToken();

    cy.okapiRequest({
      method: 'GET',
      path: 'search/instances?limit=500&query=title%3DautoTestInstance',
      isDefaultSearchParamsRequired: false,
      // searchParams: { query: `name=Instance` },
    }).then((response) => {
      console.log(response);
      response.body.instances.forEach((item) => {
        cy.okapiRequest({
          method: 'DELETE',
          path: `inventory/instances/${item.id}`,
          failOnStatusCode: false,
        });
      });
    });
  });
});
