import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = "Something went wrong. Please try again.";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") error = body;
      else if (typeof body === "object" && body !== null) {
        const obj = body as Record<string, unknown>;
        error =
          typeof obj.error === "string" ? obj.error : (obj.message as string) ?? error;
        if (Array.isArray(obj.message)) error = (obj.message as string[]).join(", ");
      }
    } else if (
      typeof exception === "object" &&
      exception !== null &&
      "status" in exception &&
      typeof (exception as { status: unknown }).status === "number"
    ) {
      status = (exception as { status: number }).status;
      if (status === 400) error = "Invalid request body";
    }

    res.status(status).json({ ok: false, error });
  }
}
