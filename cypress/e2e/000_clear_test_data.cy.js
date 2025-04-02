import Institutions from '../support/fragments/settings/tenant/location-setup/institutions';
import Campuses from '../support/fragments/settings/tenant/location-setup/campuses';
import Libraries from '../support/fragments/settings/tenant/location-setup/libraries';
import Locations from '../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';
import Users from '../support/fragments/users/users';
import PatronGroups from '../support/fragments/settings/users/patronGroups';

describe('Delete test entities', () => {
  it.only('001 Delete test users, groups and service points created by autotests',
    { tags: ['deleteTestData'] },
    () => {
      let defaultServicePointId = '';
      cy.getAdminToken().then(() => {
        ServicePoints.getViaApi().then((servicePoints) => {
          defaultServicePointId = servicePoints.find((sp) => sp.name === 'Circ Desk 1').id;
        }).then(() => {
          cy.okapiRequest({
            path: 'users',
          }).then(({ body }) => {
            cy.log(body.users.length);
            body.users.forEach((user) => {
              if (user.username?.includes('cypress')
                || user.username?.includes('testUser')
                || user.username?.includes('autotestuser')
                || user.personal.lastName?.includes('test_user')
                || user.username?.includes('at_username')) {
                // cy.log(user);
                UserEdit.changeServicePointPreferenceViaApi(user.id, [defaultServicePointId]);
                Users.deleteViaApi(user.id);
              }
            });
          });
        });
      }).then(() => {
        cy.okapiRequest({
          path: 'groups',
        }).then(({ body }) => {
          cy.log(body);
          body.usergroups.forEach((group) => {
            if (group.group.includes('auto')
              || group.group.includes('groupTo')
              || group.group.includes('groupName')
              || group.group.includes('test')
              || group.group.includes('Patron_group')
              || group.group.includes('Auto Group')
              || group.group.includes('feeGroup')
              || group.group.includes('AT_')) {
              PatronGroups.deleteViaApi(group.id);
            }
          });
        });
      }).then(() => {
        cy.okapiRequest({
          method: 'GET',
          path: 'service-points',
          searchParams: { limit: 2000 },
        }).then((response) => {
          cy.log(response.body.servicepoints.length);
          response.body.servicepoints.forEach((servicePoint) => {
            if (servicePoint.name.includes('autotest')) {
              cy.log(servicePoint.name);
              cy.okapiRequest({
                method: 'DELETE',
                path: `service-points/${servicePoint.id}`,
                isDefaultSearchParamsRequired: false,
                failOnStatusCode: false,
              });
            }
          });
        });
      });
    });

  it('002 Delete locations, libraries, campuses and institutions created by autotests',
    { tags: ['deleteTestData'] },
    () => {
      cy.getAdminToken().then(() => {
        Locations.getViaApi().then((locationsResponse) => {
          locationsResponse.locations.forEach((location) => {
            if (location.name.includes('autotest_location')) {
              // cy.log(location.name);
              location.servicePointIds.forEach((servicePointId) => {
                ServicePoints.deleteViaApi(servicePointId);
              });
              Locations.deleteLocationViaApi(location.id);
            }
          });
        });
      }).then(() => {
        Libraries.getViaApi().then((librariesResponse) => {
          librariesResponse.loclibs.forEach((library) => {
            if (library.name.includes('autotest_library')) {
              // cy.log(library.name);
              Libraries.deleteViaApi(library.id);
            }
          });
        });
      }).then(() => {
        Campuses.getViaApi().then((campusesResponse) => {
          campusesResponse.loccamps.forEach((campus) => {
            if (campus.name.includes('autotest_campuse')) {
              // cy.log(campus.name);
              Campuses.deleteViaApi(campus.id);
            }
          });
        });
      })
        .then(() => {
          Institutions.getViaApi().then((institutionsResponse) => {
            institutionsResponse.locinsts.forEach((institution) => {
              if (institution.name.includes('autotest_institution')) {
                // cy.log(institution.name);
                Institutions.deleteViaApi(institution.id);
              }
            });
          });
        });
    });
});
