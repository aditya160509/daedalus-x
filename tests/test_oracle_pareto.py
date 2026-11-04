import numpy as np

from daedalus import oracle


def test_pareto_front_is_nondominated_and_feasible() -> None:
    x = oracle.candidates(12, seed=1)
    gp = oracle.GP(x, oracle.synthetic_cda(x))
    front = oracle.pareto(gp, pop=24, gens=10)
    f = np.column_stack([front["cda_m2"], front["cda_sd_m2"]])
    assert len(f) > 1
    assert oracle.study_feasible(front["unit"]).all()
    for i, a in enumerate(f):
        assert not any((b <= a).all() and (b < a).any() for j, b in enumerate(f) if j != i)


def test_robust_times_penalise_uncertainty() -> None:
    from daedalus.api.oracle import robust_times

    p50, p90 = robust_times(np.array([0.0025, 0.0025]), np.array([1e-5, 4e-4]))
    assert (p90 > p50).all()
    assert p90[1] > p90[0]
