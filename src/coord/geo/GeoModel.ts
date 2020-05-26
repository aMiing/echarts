/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/


import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';
import ComponentModel from '../../model/Component';
import Model from '../../model/Model';
import {DataSelectableMixin, DataSelectableOptionMixin, SelectableTarget} from '../../component/helper/selectableMixin';
import geoCreator from './geoCreator';
import Geo from './Geo';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    ItemStyleOption,
    ZRColor,
    LabelOption,
    DisplayState,
    RoamOptionMixin,
    AnimationOptionMixin
} from '../../util/types';
import { NameMap } from './geoTypes';
import GlobalModel from '../../model/Global';


export interface GeoItemStyleOption extends ItemStyleOption {
    areaColor?: ZRColor;
};
interface GeoLabelOption extends LabelOption {
    formatter?: string | ((params: GeoLabelFormatterDataParams) => string);
}
interface GeoLabelFormatterDataParams {
    name: string;
    status: DisplayState;
}

export interface RegoinOption extends SelectableTarget {
    itemStyle?: GeoItemStyleOption;
    label?: GeoLabelOption;
    emphasis?: {
        itemStyle?: GeoItemStyleOption;
        label?: GeoLabelOption;
    }
};

export interface GeoCommonOptionMixin extends RoamOptionMixin {
    // Map name
    map: string;

    // Aspect is width / height. Inited to be geoJson bbox aspect
    // This parameter is used for scale this aspect
    aspectScale?: number;

    ///// Layout with center and size
    // If you wan't to put map in a fixed size box with right aspect ratio
    // This two properties may more conveninet
    layoutCenter?: number[];
    layoutSize?: number;

    // Define left-top, right-bottom coords to control view
    // For example, [ [180, 90], [-180, -90] ]
    // higher priority than center and zoom
    boundingCoords?: number[][];

    nameMap?: NameMap;
}

export interface GeoOption extends
    ComponentOption,
    BoxLayoutOptionMixin,
    DataSelectableOptionMixin,
    // For lens animation on geo.
    AnimationOptionMixin,
    GeoCommonOptionMixin {

    show?: boolean;
    silent?: boolean;

    itemStyle?: GeoItemStyleOption;
    label?: GeoLabelOption;

    emphasis?: {
        itemStyle?: GeoItemStyleOption;
        label?: GeoLabelOption;
    };

    regions: RegoinOption[];
}

const LABEL_FORMATTER_NORMAL = ['label', 'formatter'] as const;
const LABEL_FORMATTER_EMPHASIS = ['emphasis', 'label', 'formatter'] as const;

class GeoModel extends ComponentModel<GeoOption> {

    static type = 'geo';
    readonly type = GeoModel.type;

    coordinateSystem: Geo;

    static layoutMode = 'box' as const;

    private _optionModelMap: zrUtil.HashMap<Model<RegoinOption>>;

    static defaultOption: GeoOption = {

        zlevel: 0,

        z: 0,

        show: true,

        left: 'center',

        top: 'center',

        // If svg used, aspectScale is 1 by default.
        // aspectScale: 0.75,
        aspectScale: null,

        ///// Layout with center and size
        // If you wan't to put map in a fixed size box with right aspect ratio
        // This two properties may more conveninet
        // layoutCenter: [50%, 50%]
        // layoutSize: 100

        silent: false,

        // Map type
        map: '',

        // Define left-top, right-bottom coords to control view
        // For example, [ [180, 90], [-180, -90] ]
        boundingCoords: null,

        // Default on center of map
        center: null,

        zoom: 1,

        scaleLimit: null,

        // selectedMode: false

        label: {
            show: false,
            color: '#000'
        },

        itemStyle: {
            // color: 各异,
            borderWidth: 0.5,
            borderColor: '#444',
            color: '#eee'
        },

        emphasis: {
            label: {
                show: true,
                color: 'rgb(100,0,0)'
            },
            itemStyle: {
                color: 'rgba(255,215,0,0.8)'
            }
        },

        regions: []
    };

    init(option: GeoOption, parentModel: Model, ecModel: GlobalModel): void {
        super.init(option, parentModel, ecModel);
        // Default label emphasis `show`
        modelUtil.defaultEmphasis(option, 'label', ['show']);
    }

    optionUpdated(): void {
        const option = this.option;
        const self = this;

        option.regions = geoCreator.getFilledRegions(option.regions, option.map, option.nameMap);

        this._optionModelMap = zrUtil.reduce(option.regions || [], function (optionModelMap, regionOpt) {
            if (regionOpt.name) {
                optionModelMap.set(regionOpt.name, new Model(regionOpt, self));
            }
            return optionModelMap;
        }, zrUtil.createHashMap());

        this.updateSelectedMap(option.regions);
    }

    /**
     * Get model of region.
     */
    getRegionModel(name: string): Model<RegoinOption> {
        return this._optionModelMap.get(name) || new Model(null, this, this.ecModel);
    }

    /**
     * Format label
     * @param name Region name
     */
    getFormattedLabel(name: string, status?: DisplayState) {
        const regionModel = this.getRegionModel(name);
        const formatter = status === 'normal'
            ? regionModel.get(LABEL_FORMATTER_NORMAL)
            : regionModel.get(LABEL_FORMATTER_EMPHASIS);
        const params = {
            name: name
        } as GeoLabelFormatterDataParams;
        if (typeof formatter === 'function') {
            params.status = status;
            return formatter(params);
        }
        else if (typeof formatter === 'string') {
            return formatter.replace('{a}', name != null ? name : '');
        }
    }

    setZoom(zoom: number): void {
        this.option.zoom = zoom;
    }

    setCenter(center: number[]): void {
        this.option.center = center;
    }

}

ComponentModel.registerClass(GeoModel);

interface GeoModel extends DataSelectableMixin<GeoOption> {};
zrUtil.mixin(GeoModel, DataSelectableMixin);

export default GeoModel;