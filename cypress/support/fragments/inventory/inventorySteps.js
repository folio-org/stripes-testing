import holdingsRecordView from './holdingsRecordView';
import inventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';
import interactorsTools from '../../utils/interactorsTools';

export default {
  addMarcHoldingRecord:() => {
    inventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    QuickMarcEditor.pressSaveAndClose();
    interactorsTools.closeCalloutMessage();
    holdingsRecordView.waitLoading();
  },
};
