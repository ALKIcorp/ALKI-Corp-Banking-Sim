package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.ClientJob;
import com.alkicorp.bankingsim.model.Job;
import com.alkicorp.bankingsim.service.JobService;
import com.alkicorp.bankingsim.web.dto.JobResponse;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public List<JobResponse> list() {
        return jobService.listJobs().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public JobResponse create(@RequestBody Job job) {
        return toResponse(jobService.createJob(job));
    }

    @PostMapping("/clients/{clientId}/assign/{jobId}")
    public JobResponse assign(@PathVariable int slotId, @PathVariable Long clientId, @PathVariable Long jobId) {
        ClientJob cj = jobService.assignJob(slotId, clientId, jobId, true);
        return toResponse(cj.getJob());
    }

    private JobResponse toResponse(Job job) {
        return JobResponse.builder()
            .id(job.getId())
            .title(job.getTitle())
            .employer(job.getEmployer())
            .annualSalary(job.getAnnualSalary())
            .payCycleDays(job.getPayCycleDays())
            .spendingProfile(job.getSpendingProfile())
            .build();
    }
}
