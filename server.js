const app = require('express')();											// use express for routing
const Pool = require('pg').Pool;											// use pg for postgres requests

const config = {
  user: 'postgres',
  database: 'postgres',
  host: 'localhost',
  port: '5432',
  password: process.env.DB_PASSWORD
}

const pool = new Pool(config);
const temp = [];
const facilityNames = [];
const facility = [];
const mean = {};
const outp = {};
const intermed = {};
const averg = 0;
const bigcount = [];

/*
  HCAHPS Composite Measures

1. Communication with Nurses (Q1, Q2, Q3)

2. Communication with Doctors (Q5, Q6, Q7)

3. Responsiveness of Hospital Staff (Q4, Q11)

4. Pain Management (Q13, Q14)

5. Communication about Medicines (Q16, Q17)

6. Discharge Information (Q19, Q20)

7. Care Transition (Q23, Q24, Q25)

 HCAHPS Individual Items

8. Cleanliness of Hospital Environment (Q8)

9. Quietness of Hospital Environment (Q9)

 HCAHPS Global Items

10. Hospital Rating (Q21)

11. Recommend the Hospital (Q22)
*/

const measures = {																								// use same names for components and data
  comm_nurse: ['q1', 'q2', 'q3'],
  comm_doc: ['q5', 'q6', 'q7'],
  comm_staff: ['q4', 'q11'],
  pain: ['q13', 'q14'],
  comm_meds: ['q16', 'q17'],
  discharge: ['q19', 'q20'],
  care: ['q23', 'q24', 'q25'],
  cleanliness: ['q8'],
  quietness: ['q9'],
  rating: ['q21'],
  recc: ['q22']
};

const Star = {											// store upper limits of each rating
  "Communication with Nurses": [
    { value: "0" },
    { value: "85" },
    { value: "90" },
    { value: "92" },
    { value: "95" }
  ],
  "Communication with Doctors": [
    { value: "0" },
    { value: "88" },
    { value: "91" },
    { value: "93" },
    { value: "95" }

  ],
  "Cleanliness of Hospital Environment": [
    { value: "0" },
    { value: "82" },
    { value: "87" },
    { value: "89" },
    { value: "93" }
  ],
  "Quietness of Hospital Environment": [
    { value: "0" },
    { value: "77" },
    { value: "82" },
    { value: "86" },
    { value: "91" }
  ],
  "Hospital Rating": [
    { value: "0" },
    { value: "82" },
    { value: "86" },
    { value: "90" },
    { value: "93" }
  ],
  "Recommend the Hospital": [
    { value: "0" },
    { value: "82" },
    { value: "86" },
    { value: "90" },
    { value: "94" }
  ]
};

const keys = Object.keys(measures);										// store keys of object in constiable

app.get('/', function (req, res) {
  pool.query('SELECT * FROM random', function (err, result) {			// select all data from table
    if (err) {
      res.status(500).send(err.toString());
    } else {
      results = result.rows;														// store results in a constiable

      function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
      }

      for (const i = 0; i < results.length; i++) {														// store all facility ids in temp( with repetition)
        temp.push(Number(results[i].facility_id));
      }

      facilityNames = temp.filter(onlyUnique);									// get only unique elements in facilityNames using function

      for (const i = 0; i < facilityNames.length; i++) {												// intializing arrays
        facility[facilityNames[i]] = [];
        mean[facilityNames[i]] = [];
        intermed[facilityNames[i]] = [];
        outp[facilityNames[i]] = [];
      }

      for (const i = 0; i < results.length; i++) {														// check whether form is of survey and push into facility[facility_name] array
        for (const j = 0; j < results[i].assignedpackets.assignedPackets[0].templates.length; j++) {
          if (results[i].assignedpackets.assignedPackets[0].templates[j].formTemplate.formName == "HCAHPS Survey")
            facility[Number(results[i].facility_id)].push(results[i].assignedpackets.assignedPackets[0].templates[j]);
        }
      }

      avg();														// call avg to calculate output
      const outObj = [];

      for (const i = 0; i < facilityNames.length; i++) {					// Write Output as required
        const outObjTemplate = {										//template of output object
          FacilityID: '',
          NoofRespondent: '',
          "Composite Measures": {
            "Communication with Nurses": '',
            "Rating 1": '',
            "Communication with Doctors": '',
            "Rating 2": ''
          },
          "Individual Items": {
            "Cleanliness of Hospital Environment": '',
            "Rating 3": '',
            "Quietness of Hospital Environment": '',
            "Rating 4": ''
          },
          "Global Items": {
            "Hospital Rating": '',
            "Rating 5": '',
            "Recommend the Hospital": '',
            "Rating 6": ''
          }
        };

        outObjTemplate.FacilityID = facilityNames[i];
        outObjTemplate.NoofRespondent = bigcount[facilityNames[i]];
        //				console.log(0 + ' ' + i);
        outObjTemplate['Composite Measures']['Communication with Nurses'] = outp[facilityNames[i]][0];
        outObjTemplate['Composite Measures']['Rating 1'] = getRating('Communication with Nurses', outp[facilityNames[i]][0]);
        //				console.log(1+ ' '+ i);
        outObjTemplate['Composite Measures']['Communication with Doctors'] = outp[facilityNames[i]][1];
        outObjTemplate['Composite Measures']['Rating 2'] = getRating('Communication with Doctors', outp[facilityNames[i]][1]);
        //				console.log(2+ ' '+ i);
        outObjTemplate['Individual Items']['Cleanliness of Hospital Environment'] = outp[facilityNames[i]][7];
        outObjTemplate['Individual Items']['Rating 3'] = getRating('Cleanliness of Hospital Environment', outp[facilityNames[i]][7]);
        //				console.log(3+ ' '+ i);
        outObjTemplate['Individual Items']['Quietness of Hospital Environment'] = outp[facilityNames[i]][8];
        outObjTemplate['Individual Items']['Rating 4'] = getRating('Quietness of Hospital Environment', outp[facilityNames[i]][8]);
        //				console.log(4+ ' '+ i);
        outObjTemplate['Global Items']['Hospital Rating'] = outp[facilityNames[i]][9];
        outObjTemplate['Global Items']['Rating 5'] = getRating('Hospital Rating', outp[facilityNames[i]][9]);
        //console.log(5+ ' '+ i);
        outObjTemplate['Global Items']['Recommend the Hospital'] = outp[facilityNames[i]][10];
        outObjTemplate['Global Items']['Rating 6'] = getRating('Hospital Rating', outp[facilityNames[i]][10]);
        //console.log(6+ ' '+ i);
        outObj.push(outObjTemplate);
      }



      //res.send(JSON.stringify(getRating('Communication with Nurses',outp[facilityNames[0]][0])));
      res.send(JSON.stringify(outObj));
    }
  });
});

function getRating(reqKey, num) {
  const i = 0;
  if (num == 100)
    return 5;
  while (num > Star[reqKey][i].value && Star[reqKey][i] != undefined) {
    //console.log ('working till : ' + i + ' ' + num + ' ' + reqKey);
    i++;
  }
  return i;
};

function avg() {																							// function to calculate rating

  for (const i = 0; i < facilityNames.length; i++) {											// loop to traverse names of facilities
    for (const k = 0; k < keys.length; k++) {													// loop to traverse keys
      for (const l = 0; l < keys[k].length; l++) {											// loop to traverse measures object usin keys
        if (measures[keys[k]][l] != undefined) {
          averg = 0;
          const j = 0;
          while (facility[facilityNames[i]][j] != undefined) {					// if facility defined , add to averg
            averg += Number(facility[facilityNames[i]][j].data[measures[keys[k]][l]]);
            j++;											// j used to count
          }
          averg /= j;												// divide by j to get averg
          mean[facilityNames[i]].push(averg);						// push to mean object array according to facilityname

          const tempjson = facility[facilityNames[0]][1].formTemplate.components;		// store address in tempjson


          // convert top of mean to 100 value using given formula
          for (const m = 0; m < tempjson.length; m++) {
            if (measures[keys[k]][l] == tempjson[m].key) {
              const calc = 100 * (mean[facilityNames[i]][mean[facilityNames[i]].length - 1] - tempjson[m].values[0].value) / (tempjson[m].values[tempjson[m].values.length - 1].value - tempjson[m].values[0].value);
              intermed[facilityNames[i]].push(calc);
            }
          }
        }
      }
      const calc = 0;
      const count = 0;

      // calculate individual measures using 100 output and push using facilityNames, answers saved in order of questions

      for (const n = 0; n < keys[k].length; n++) {
        if (measures[keys[k]][n] != undefined) {
          calc += (intermed[facilityNames[i]][count]);
          count++;
        }
      }
      calc /= (count);
      calc = Math.round(calc);
      outp[facilityNames[i]].push(calc);
      bigcount[facilityNames[i]] = j;

    }
  }

}

pool.connect(function (err) {										// connect to check if db working
  if (err) {
    console.log(err);
  }
  else console.log('connected');
});

const port = process.env.PORT || 8080																		// listen on env or local port
app.listen(port, function () {
  console.log('listening on ' + port);
});
