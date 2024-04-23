"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JOS3Defaults = {
    // Body information
    height: 1.72,
    weight: 74.43,
    age: 20,
    body_fat: 15,
    cardiac_index: 2.59,
    blood_flow_rate: 290,
    physical_activity_ratio: 1.25,
    metabolic_rate: 1.0,
    sex: "male",
    posture: "standing",
    bmr_equation: "harris-benedict",
    bsa_equation: "dubois",
    local_bsa: [
        0.11, 0.029, 0.175, 0.161, 0.221, 0.096, 0.063, 0.05, 0.096, 0.063, 0.05,
        0.209, 0.112, 0.056, 0.209, 0.112, 0.056,
    ],
    // Environment information
    core_temperature: 37,
    skin_temperature: 34,
    other_body_temperature: 36,
    dry_bulb_air_temperature: 28.8,
    mean_radiant_temperature: 28.8,
    relative_humidity: 50,
    air_speed: 0.1,
    // Clothing information
    clothing_insulation: 0,
    clothing_vapor_permeation_efficiency: 0.45,
    lewis_rate: 16.5, // [K/kPa]
};
exports.default = JOS3Defaults;
