import { Button } from '../../../../../../interactors';
import ResultsPane from '../resultsPane';
import JobProfileEditForm from './jobProfileEditForm';

import getRandomPostfix from '../../../../utils/stringTools';
import { PROFILE_TYPE_NAMES } from '../../../../constants';

const marcAuthorityUpdateJobProfile = {
  profile: {
    name: `Update MARC authority records - 010 $a${getRandomPostfix()}`,
    description: '',
    dataType: 'MARC',
  },
  addedRelations: [
    {
      masterProfileId: null,
      masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
      // match profile should be specified
      detailProfileId: null,
      detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
      order: 0,
    },
    {
      // match profile should be specified
      masterProfileId: null,
      masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
      // action profile should be specified
      detailProfileId: null,
      detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
      order: 0,
      reactTo: 'MATCH',
    },
  ],
  deletedRelations: [],
};

export default {
  ...ResultsPane,
  createNewJobProfile() {
    ResultsPane.expandActionsDropdown();
    cy.do(Button('New job profile').click());
    JobProfileEditForm.waitLoading();
    JobProfileEditForm.verifyFormView();

    return JobProfileEditForm;
  },
  getJobProfilesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'data-import-profiles/jobProfiles',
        isDefaultSearchParamsRequired: false,
        searchParams,
      })
      .then(({ body }) => body);
  },
  createJobProfileViaApi(jobProfile = marcAuthorityUpdateJobProfile) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'data-import-profiles/jobProfiles',
      body: jobProfile,
    });
  },
  deleteJobProfileViaApi(profileId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `data-import-profiles/jobProfiles/${profileId}`,
    });
  },
  deleteJobProfileByNameViaApi(profileName) {
    this.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(({ jobProfiles }) => {
      jobProfiles.forEach((jobProfile) => {
        this.deleteJobProfileViaApi(jobProfile.id);
      });
    });
  },
};
