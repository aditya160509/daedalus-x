"""Validate library integration against known analytic variance/effect ratios."""

import numpy as np
import pytest

from daedalus.sensitivity import analyze


def test_additive_sobol_variance_shares() -> None:
    result = analyze(lambda x: x[:, 0] + 2 * x[:, 1], ["a", "b"])
    assert result["samples"] == 1024
    rows = result["rows"]
    assert rows[0]["first_order"] == pytest.approx(0.2, abs=0.03)
    assert rows[1]["total_order"] == pytest.approx(0.8, abs=0.03)


def test_morris_linear_effects_and_constant_target() -> None:
    result = analyze(lambda x: x[:, 0] + 2 * x[:, 1], ["a", "b"], method="morris")
    assert result["rows"][1]["mu_star"] / result["rows"][0]["mu_star"] == pytest.approx(2)
    with pytest.raises(ValueError, match="no resolved output variation"):
        analyze(lambda x: np.ones(len(x)), ["a", "b"])
