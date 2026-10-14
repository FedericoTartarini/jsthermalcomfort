import json
from pathlib import Path
import numpy as np
from pythermalcomfort.models import heat_index_schoen

cases = [(29,50),(10,50),([29,35,45,55],[50,60,70,80]),
 ([26.689952,30.436055,35.979625,41.740423],50),
 ([[20],[30]],[40,60,80]),([],50),(29,[50]),
 (True,False),(29,0),(29,100),(-243.12,50),(float('nan'),50),
 (float('inf'),50),(29,float('nan'))]

def safe(v):
    if isinstance(v,list): return [safe(x) for x in v]
    if isinstance(v,float) and not np.isfinite(v): return str(v)
    return v
rows=[]
for t,r in cases:
    for rounding in [True,False]:
        with np.errstate(all='ignore'):
            result=heat_index_schoen(t,r,rounding)
        rows.append(dict(tdb=safe(t),rh=safe(r),round_output=rounding,
                         hi=safe(result.hi.tolist()),stress_category=safe(np.asarray(result.stress_category).tolist())))
Path(__file__).with_name('schoen_python_fixtures.json').write_text(json.dumps(dict(
 reference='pythermalcomfort f0fa940d9a944c391f20b3223b478a40fe52659d',cases=rows),indent=2))

